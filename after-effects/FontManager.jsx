// FontManager.jsx
// Dockable panel to find, list, and consolidate fonts across an AE project.

(function(thisObj) {
    var SCRIPT_NAME = "Font Manager";

    var fontData = {};
    var sortedKeys = [];

    // ---- Scanning ----

    function scanProject() {
        fontData = {};
        var compsScanned = 0;
        for (var i = 1; i <= app.project.numItems; i++) {
            var item;
            try { item = app.project.item(i); } catch (e) { continue; }
            if (!(item instanceof CompItem)) continue;
            compsScanned++;
            try { scanComp(item); } catch (e) { /* skip broken comp */ }
        }
        sortedKeys = [];
        for (var k in fontData) sortedKeys.push(k);
        sortedKeys.sort(function(a, b) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
        });
        return compsScanned;
    }

    function scanComp(comp) {
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer;
            try { layer = comp.layer(i); } catch (e) { continue; }
            if (!(layer instanceof TextLayer)) continue;
            var prop;
            try { prop = layer.property("Source Text"); } catch (e) { continue; }
            if (!prop) continue;
            try {
                if (prop.numKeys > 0) {
                    for (var k = 1; k <= prop.numKeys; k++) {
                        try {
                            var doc = prop.keyValue(k);
                            if (doc && doc.font) recordFont(doc.font, comp.name, layer, k);
                        } catch (e) { /* skip */ }
                    }
                } else {
                    var doc = prop.value;
                    if (doc && doc.font) recordFont(doc.font, comp.name, layer, 0);
                }
            } catch (e) { /* skip */ }
        }
    }

    function recordFont(psName, compName, layer, keyIndex) {
        if (!psName || psName === "") return;
        if (!fontData[psName]) {
            fontData[psName] = { name: psName, count: 0, compSet: {}, entries: [] };
        }
        var fd = fontData[psName];
        fd.count++;
        fd.compSet[compName] = true;
        fd.entries.push({ layer: layer, keyIndex: keyIndex });
    }

    // ---- Expression updater (for layer renames) ----

    function updateExpressionsInGroup(propGroup, oldName, newName) {
        for (var i = 1; i <= propGroup.numProperties; i++) {
            try {
                var prop = propGroup.property(i);
                if (prop.canSetExpression) {
                    var expr = prop.expression;
                    if (expr && expr !== "") {
                        var dq = '"' + oldName + '"';
                        var sq = "'" + oldName + "'";
                        if (expr.indexOf(dq) !== -1 || expr.indexOf(sq) !== -1) {
                            expr = expr.split(dq).join('"' + newName + '"');
                            expr = expr.split(sq).join("'" + newName + "'");
                            prop.expression = expr;
                        }
                    }
                } else if (prop.numProperties && prop.numProperties > 0) {
                    updateExpressionsInGroup(prop, oldName, newName);
                }
            } catch (e) { /* skip unreadable props */ }
        }
    }

    function updateExpressionsForRename(oldName, newName) {
        for (var i = 1; i <= app.project.numItems; i++) {
            try {
                var item = app.project.item(i);
                if (!(item instanceof CompItem)) continue;
                for (var l = 1; l <= item.numLayers; l++) {
                    try { updateExpressionsInGroup(item.layer(l), oldName, newName); } catch (e) { /* skip */ }
                }
            } catch (e) { /* skip */ }
        }
    }

    // ---- Font Replacement ----

    function replaceFonts(fromName, toName) {
        if (fromName === toName) {
            return { ok: false, msg: "Source and target fonts are identical." };
        }
        if (!fontData[fromName]) {
            return { ok: false, msg: "Font not found: " + fromName };
        }
        var entries = fontData[fromName].entries;
        var replaced = 0;
        app.beginUndoGroup("Font Manager: Replace Font");
        try {
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                var prop = e.layer.property("Source Text");
                if (e.keyIndex === 0) {
                    var doc = prop.value;
                    doc.font = toName;
                    prop.setValue(doc);
                } else {
                    var doc = prop.keyValue(e.keyIndex);
                    doc.font = toName;
                    prop.setValueAtKey(e.keyIndex, doc);
                }
                replaced++;
            }
        } catch (err) {
            app.endUndoGroup();
            return { ok: false, msg: "Error: " + err.message };
        }
        app.endUndoGroup();
        return { ok: true, msg: "Done. Replaced " + replaced + " instance(s)." };
    }

    // ---- Layer Rename ----

    function uniqueLayers(fontName) {
        var entries = fontData[fontName].entries;
        var seen = [];
        var layers = [];
        for (var i = 0; i < entries.length; i++) {
            var layer = entries[i].layer;
            var found = false;
            for (var j = 0; j < seen.length; j++) {
                if (seen[j] === layer) { found = true; break; }
            }
            if (!found) { seen.push(layer); layers.push(layer); }
        }
        return layers;
    }

    function renameLayers(fontName, prefix, suffix) {
        if (!fontData[fontName]) {
            return { ok: false, msg: "Select a font from the list first." };
        }
        if (prefix === "" && suffix === "") {
            return { ok: false, msg: "Enter a prefix and/or suffix." };
        }
        var layers = uniqueLayers(fontName);
        var renamed = 0;
        var exprUpdated = 0;

        app.beginUndoGroup("Font Manager: Rename Layers");
        try {
            for (var i = 0; i < layers.length; i++) {
                var oldName = layers[i].name;
                var newName = prefix + oldName + suffix;
                layers[i].name = newName;
                renamed++;
                // Update any expression in the whole project that referenced this layer name
                var before = exprUpdated;
                updateExpressionsForRename(oldName, newName);
                // (expression count tracking is approximate; we just report renames)
            }
        } catch (err) {
            app.endUndoGroup();
            return { ok: false, msg: "Error: " + err.message };
        }
        app.endUndoGroup();
        return {
            ok: true,
            msg: "Renamed " + renamed + " layer" + (renamed !== 1 ? "s" : "") +
                 " + expressions updated. (Undoable)"
        };
    }

    // ---- UI ----

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME, undefined, { resizable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 10;

        // Header
        var headerGrp = win.add("group");
        headerGrp.orientation = "row";
        headerGrp.alignChildren = ["fill", "center"];
        headerGrp.add("statictext", undefined, SCRIPT_NAME).alignment = ["fill", "center"];
        var refreshBtn = headerGrp.add("button", undefined, "\u21BA  Refresh");
        refreshBtn.preferredSize = [95, 24];

        // Font list panel
        var listPanel = win.add("panel", undefined, "Fonts in Project");
        listPanel.orientation = "column";
        listPanel.alignChildren = ["fill", "top"];
        listPanel.margins = [10, 15, 10, 8];
        listPanel.spacing = 5;

        var fontList = listPanel.add("listbox", undefined, [], {
            multiselect: false,
            numberOfColumns: 2,
            showHeaders: true,
            columnTitles: ["PostScript Name", "Uses"],
            columnWidths: [220, 45]
        });
        fontList.preferredSize = [330, 190];

        var statsLabel = listPanel.add("statictext", undefined, "Press Refresh to scan the project");
        statsLabel.alignment = ["fill", "center"];

        // Consolidate / Replace panel
        var replPanel = win.add("panel", undefined, "Consolidate / Replace Font");
        replPanel.orientation = "column";
        replPanel.alignChildren = ["fill", "top"];
        replPanel.margins = [10, 15, 10, 10];
        replPanel.spacing = 6;

        var fromGrp = replPanel.add("group");
        fromGrp.orientation = "row";
        fromGrp.alignChildren = ["left", "center"];
        fromGrp.add("statictext", undefined, "Replace:").preferredSize = [56, 20];
        var fromDrop = fromGrp.add("dropdownlist", undefined, []);
        fromDrop.preferredSize = [250, 22];

        var toGrp = replPanel.add("group");
        toGrp.orientation = "row";
        toGrp.alignChildren = ["left", "center"];
        toGrp.add("statictext", undefined, "With:").preferredSize = [56, 20];
        var toDrop = toGrp.add("dropdownlist", undefined, []);
        toDrop.preferredSize = [250, 22];

        var applyFontBtn = replPanel.add("button", undefined, "Apply Font Replacement");
        applyFontBtn.alignment = ["fill", "center"];
        applyFontBtn.preferredSize = [-1, 28];

        // Rename Layers panel
        var renamePanel = win.add("panel", undefined, "Rename Layers  \u2014  select a font above first");
        renamePanel.orientation = "column";
        renamePanel.alignChildren = ["fill", "top"];
        renamePanel.margins = [10, 15, 10, 10];
        renamePanel.spacing = 6;

        var prefixGrp = renamePanel.add("group");
        prefixGrp.orientation = "row";
        prefixGrp.alignChildren = ["left", "center"];
        prefixGrp.add("statictext", undefined, "Prefix:").preferredSize = [46, 20];
        var prefixInput = prefixGrp.add("edittext", undefined, "");
        prefixInput.preferredSize = [260, 22];

        var suffixGrp = renamePanel.add("group");
        suffixGrp.orientation = "row";
        suffixGrp.alignChildren = ["left", "center"];
        suffixGrp.add("statictext", undefined, "Suffix:").preferredSize = [46, 20];
        var suffixInput = suffixGrp.add("edittext", undefined, "");
        suffixInput.preferredSize = [260, 22];

        var applyRenameBtn = renamePanel.add("button", undefined, "Apply Rename + Update Expressions");
        applyRenameBtn.alignment = ["fill", "center"];
        applyRenameBtn.preferredSize = [-1, 28];

        // Status bar
        var statusTxt = win.add("statictext", undefined, "");
        statusTxt.alignment = ["fill", "center"];
        statusTxt.characters = 55;
        statusTxt.justify = "center";

        // ---- Helpers ----

        function setStatus(msg) { statusTxt.text = msg; }

        function selectedFontName() {
            return fontList.selection ? fontList.selection.text : null;
        }

        function rebuildDropdowns() {
            fromDrop.removeAll();
            toDrop.removeAll();
            for (var i = 0; i < sortedKeys.length; i++) {
                fromDrop.add("item", sortedKeys[i]);
                toDrop.add("item", sortedKeys[i]);
            }
            if (sortedKeys.length > 0) {
                fromDrop.selection = 0;
                toDrop.selection = sortedKeys.length > 1 ? 1 : 0;
            }
        }

        function rebuildList() {
            fontList.removeAll();
            for (var i = 0; i < sortedKeys.length; i++) {
                var fd = fontData[sortedKeys[i]];
                var item = fontList.add("item", fd.name);
                item.subItems[0].text = String(fd.count);
            }
        }

        function doRefresh() {
            setStatus("Scanning\u2026");
            try {
                var numComps = scanProject();
                rebuildList();
                rebuildDropdowns();
                var n = sortedKeys.length;
                statsLabel.text = n + " unique font" + (n !== 1 ? "s" : "") +
                    " across " + numComps + " comp" + (numComps !== 1 ? "s" : "");
                setStatus(n > 0 ? "Ready." : "No text layers found in project.");
            } catch (err) {
                setStatus("Scan error: " + err.message);
            }
            if (win.layout) win.layout.layout(true);
        }

        function syncDropdownToFont(name) {
            for (var i = 0; i < fromDrop.items.length; i++) {
                if (fromDrop.items[i].text === name) { fromDrop.selection = i; break; }
            }
        }

        function selectCompsInProject(fontName) {
            if (!fontData[fontName]) return;
            var fd = fontData[fontName];
            var matched = 0;
            for (var i = 1; i <= app.project.numItems; i++) {
                try {
                    var item = app.project.item(i);
                    var hit = (item instanceof CompItem) && !!fd.compSet[item.name];
                    item.selected = hit;
                    if (hit) matched++;
                } catch (e) { /* skip */ }
            }
            var compsArr = [];
            for (var c in fd.compSet) compsArr.push(c);
            compsArr.sort();
            setStatus(matched + " comp" + (matched !== 1 ? "s" : "") + ": " + compsArr.join(", "));
        }

        // ---- Events ----

        refreshBtn.onClick = doRefresh;

        fontList.onChange = function() {
            var name = selectedFontName();
            if (!name) return;
            syncDropdownToFont(name);
            selectCompsInProject(name);
        };

        applyFontBtn.onClick = function() {
            if (!fromDrop.selection || !toDrop.selection) {
                setStatus("Select both fonts first.");
                return;
            }
            var result = replaceFonts(fromDrop.selection.text, toDrop.selection.text);
            setStatus(result.msg);
            if (result.ok) doRefresh();
        };

        applyRenameBtn.onClick = function() {
            var name = selectedFontName();
            if (!name) {
                setStatus("Select a font from the list first.");
                return;
            }
            var result = renameLayers(name, prefixInput.text, suffixInput.text);
            setStatus(result.msg);
        };

        // ---- Show ----

        if (win instanceof Window) {
            win.center();
            win.show();
        } else {
            win.layout.layout(true);
        }

        return win;
    }

    buildUI(thisObj);

})(this);
