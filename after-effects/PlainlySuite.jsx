/*
PlainlySuite.jsx
Dockable ScriptUI panel suite for After Effects.

Panels:
- Arabic Duplicator : duplicate/link layers with Arabic suffix and opacity gating
- Parameter Creator : create Plainly parameter guide layers from selected properties
- Renderer Check    : find and fix comps not using Classic 3D renderer
*/

(function PlainlySuite(thisObj) {

  // ============================================================
  // ARABIC DUPLICATOR — logic
  // ============================================================

  var AD_SETTINGS_SECTION = "ArabicDuplicator";
  var AR_SUFFIX = "(_ARABIC)";
  var BASE_OPACITY_EFFECT_NAME = "ARABIC_BaseOpacity";
  var DEBUG_ALERTS = false;

  var controller_state = {
    comp_id: null,
    layer_name: null,
    checkbox_effect_name: null
  };

  var escape_for_expr = function (s) {
    if (s === null || s === undefined) { return ""; }
    return ("" + s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  };

  var truncate_middle = function (s, max_len) {
    if (!s) { return ""; }
    if (s.length <= max_len) { return s; }
    if (max_len <= 3) { return s.substring(0, max_len); }
    var left = Math.floor((max_len - 3) / 2);
    var right = (max_len - 3) - left;
    return s.substring(0, left) + "..." + s.substring(s.length - right);
  };

  var set_expression_checked = function (prop, expr, context_label, errors) {
    if (!prop || !prop.canSetExpression) {
      errors.push(context_label + ": property missing or cannot set expression.");
      return false;
    }
    try {
      prop.expression = expr;
      prop.expressionEnabled = true;
    } catch (e) {
      errors.push(context_label + ": failed to set expression (" + e.toString() + ")");
      return false;
    }
    try {
      if (prop.expressionError && prop.expressionError.length > 0) {
        errors.push(context_label + ": expression error: " + prop.expressionError);
        return false;
      }
    } catch (e2) {}
    return true;
  };

  var get_textdocument_text = function (prop) {
    if (!prop) { return null; }
    try {
      var td = prop.value;
      return td ? td.text : null;
    } catch (e) { return null; }
  };

  var is_comp_active = function () {
    return app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem);
  };

  var get_active_comp = function () {
    return is_comp_active() ? app.project.activeItem : null;
  };

  var find_layer_by_name = function (comp, name) {
    if (!comp || !name) { return null; }
    for (var i = 1; i <= comp.numLayers; i++) {
      var lyr = comp.layer(i);
      if (lyr && lyr.name === name) { return lyr; }
    }
    return null;
  };

  var get_first_checkbox_effect = function (layer) {
    if (!layer) { return null; }
    var fx_parade = layer.property("ADBE Effect Parade");
    if (!fx_parade) { return null; }
    for (var i = 1; i <= fx_parade.numProperties; i++) {
      var fx = fx_parade.property(i);
      if (fx && fx.matchName === "ADBE Checkbox Control") { return fx; }
    }
    return null;
  };

  var save_controller_state = function () {
    try {
      app.settings.saveSetting(AD_SETTINGS_SECTION, "comp_id", controller_state.comp_id ? ("" + controller_state.comp_id) : "");
      app.settings.saveSetting(AD_SETTINGS_SECTION, "layer_name", controller_state.layer_name || "");
      app.settings.saveSetting(AD_SETTINGS_SECTION, "checkbox_effect_name", controller_state.checkbox_effect_name || "");
    } catch (e) {}
  };

  var load_controller_state = function () {
    try {
      if (app.settings.haveSetting(AD_SETTINGS_SECTION, "comp_id")) {
        controller_state.comp_id = app.settings.getSetting(AD_SETTINGS_SECTION, "comp_id") || null;
      }
      if (app.settings.haveSetting(AD_SETTINGS_SECTION, "layer_name")) {
        controller_state.layer_name = app.settings.getSetting(AD_SETTINGS_SECTION, "layer_name") || null;
      }
      if (app.settings.haveSetting(AD_SETTINGS_SECTION, "checkbox_effect_name")) {
        controller_state.checkbox_effect_name = app.settings.getSetting(AD_SETTINGS_SECTION, "checkbox_effect_name") || null;
      }
    } catch (e) {}
  };

  var reset_controller_state = function () {
    controller_state.comp_id = null;
    controller_state.layer_name = null;
    controller_state.checkbox_effect_name = null;
    save_controller_state();
  };

  var resolve_controller = function (comp) {
    if (!controller_state.layer_name || !controller_state.checkbox_effect_name || !comp) { return null; }
    var layer = find_layer_by_name(comp, controller_state.layer_name);
    if (!layer) { return null; }
    var fx_parade = layer.property("ADBE Effect Parade");
    if (!fx_parade) { return null; }
    var checkbox_fx = fx_parade.property(controller_state.checkbox_effect_name);
    if (!checkbox_fx || checkbox_fx.matchName !== "ADBE Checkbox Control") { return null; }
    return { layer: layer, checkbox_effect_name: controller_state.checkbox_effect_name };
  };

  var is_supported_layer = function (layer) {
    if (!layer) { return false; }
    try {
      if (!layer.duplicate) { return false; }
      var mn = layer.matchName;
      return mn !== "ADBE Camera Layer" && mn !== "ADBE Light Layer";
    } catch (e) { return false; }
  };

  var ends_with = function (s, suffix) {
    if (!s || !suffix) { return false; }
    return s.indexOf(suffix, s.length - suffix.length) !== -1;
  };

  var find_or_add_transform_effect = function (layer) {
    var fx_parade = layer.property("ADBE Effect Parade");
    if (!fx_parade) { return null; }
    var existing = fx_parade.property(BASE_OPACITY_EFFECT_NAME);
    if (existing) { return existing; }
    var candidates = ["ADBE Geometry2", "ADBE Transform Group", "ADBE Transform"];
    var created = null;
    for (var i = 0; i < candidates.length; i++) {
      try { created = fx_parade.addProperty(candidates[i]); } catch (e) { created = null; }
      if (created) { break; }
    }
    if (!created) { return null; }
    try { created.name = BASE_OPACITY_EFFECT_NAME; } catch (e) {}
    return created;
  };

  var find_effect_opacity_property = function (fx) {
    if (!fx) { return null; }
    var by_name = null;
    try { by_name = fx.property("Opacity"); } catch (e) {}
    if (by_name && by_name.canSetExpression) { return by_name; }
    for (var i = 1; i <= fx.numProperties; i++) {
      var p = fx.property(i);
      if (!p || !p.canSetExpression) { continue; }
      if (p.propertyValueType !== PropertyValueType.OneD) { continue; }
      if (p.hasMin && p.hasMax && p.minValue === 0 && p.maxValue === 100) { return p; }
    }
    for (var j = 1; j <= fx.numProperties; j++) {
      var p2 = fx.property(j);
      if (p2 && p2.canSetExpression && p2.propertyValueType === PropertyValueType.OneD) { return p2; }
    }
    return null;
  };

  var clear_property_animation = function (prop) {
    if (!prop) { return; }
    try {
      if (prop.canSetExpression) { prop.expression = ""; prop.expressionEnabled = false; }
    } catch (e) {}
    try {
      if (prop.numKeys && prop.numKeys > 0) {
        for (var i = prop.numKeys; i >= 1; i--) { prop.removeKey(i); }
      }
    } catch (e2) {}
  };

  var move_opacity_animation_to_effect = function (layer, transform_opacity, fx_opacity, force_overwrite) {
    if (force_overwrite) {
      clear_property_animation(fx_opacity);
    } else {
      var dest_has_expr = fx_opacity.canSetExpression && fx_opacity.expression && fx_opacity.expression.length > 0;
      var dest_has_keys = fx_opacity.numKeys && fx_opacity.numKeys > 0;
      if (dest_has_expr || dest_has_keys) { return false; }
    }
    var src_has_expr = transform_opacity.canSetExpression && transform_opacity.expression && transform_opacity.expression.length > 0;
    if (src_has_expr) {
      fx_opacity.expression = transform_opacity.expression;
      fx_opacity.expressionEnabled = transform_opacity.expressionEnabled;
      transform_opacity.expression = "";
      transform_opacity.expressionEnabled = false;
      return true;
    }
    if (transform_opacity.numKeys && transform_opacity.numKeys > 0) {
      var n = transform_opacity.numKeys;
      for (var k = 1; k <= n; k++) {
        var t = transform_opacity.keyTime(k);
        var v = transform_opacity.keyValue(k);
        fx_opacity.setValueAtTime(t, v);
        try { fx_opacity.setInterpolationTypeAtKey(k, transform_opacity.keyInInterpolationType(k), transform_opacity.keyOutInterpolationType(k)); } catch (e) {}
        try { fx_opacity.setTemporalEaseAtKey(k, transform_opacity.keyInTemporalEase(k), transform_opacity.keyOutTemporalEase(k)); } catch (e) {}
        try {
          fx_opacity.setTemporalContinuousAtKey(k, transform_opacity.keyTemporalContinuous(k));
          fx_opacity.setTemporalAutoBezierAtKey(k, transform_opacity.keyTemporalAutoBezier(k));
        } catch (e) {}
      }
      for (var r = transform_opacity.numKeys; r >= 1; r--) { transform_opacity.removeKey(r); }
      return true;
    }
    return false;
  };

  var ensure_gated_opacity = function (layer, controller, show_when_checked, errors) {
    var transform_group = layer.property("ADBE Transform Group");
    if (!transform_group) { return; }
    var opacity_prop = transform_group.property("ADBE Opacity");
    if (!opacity_prop || !opacity_prop.canSetExpression) { return; }
    var needs_preserve = (opacity_prop.numKeys && opacity_prop.numKeys > 0) || (opacity_prop.expression && opacity_prop.expression.length > 0);
    var base_ref = "value";
    if (needs_preserve) {
      var fx = find_or_add_transform_effect(layer);
      if (fx) {
        var fx_opacity = find_effect_opacity_property(fx);
        if (fx_opacity) {
          var moved = move_opacity_animation_to_effect(layer, opacity_prop, fx_opacity, fx.name === BASE_OPACITY_EFFECT_NAME);
          if (moved || fx.name === BASE_OPACITY_EFFECT_NAME) {
            base_ref = 'effect("' + escape_for_expr(fx.name) + '")("Opacity")';
          }
        }
      }
    }
    var c_expr = 'thisComp.layer("' + escape_for_expr(controller.layer.name) + '").effect("' + escape_for_expr(controller.checkbox_effect_name) + '")("Checkbox")';
    var multiplier = show_when_checked ? "c" : "(1-c)";
    var expr = 'var c = ' + c_expr + ';\nvar base = ' + base_ref + ';\nbase * ' + multiplier + ';';
    set_expression_checked(opacity_prop, expr, 'Opacity (' + layer.name + ')', errors);
  };

  var get_source_text_prop = function (layer) {
    if (!layer) { return null; }
    try {
      var text_props = layer.property("ADBE Text Properties");
      if (!text_props) { return null; }
      var src = text_props.property("ADBE Text Document");
      return src || null;
    } catch (e) { return null; }
  };

  var ensure_text_link = function (base_layer, arabic_layer, force, errors) {
    if (!base_layer || !arabic_layer) { return; }
    var base_src = get_source_text_prop(base_layer);
    var ar_src = get_source_text_prop(arabic_layer);
    if (!base_src || !ar_src || !ar_src.canSetExpression) {
      if (!base_src) { errors.push("Text link: base layer is not a text layer (" + base_layer.name + ")"); }
      if (!ar_src) { errors.push("Text link: arabic layer is not a text layer (" + arabic_layer.name + ")"); }
      if (ar_src && !ar_src.canSetExpression) { errors.push("Text link: cannot set expression on Source Text (" + arabic_layer.name + ")"); }
      return;
    }
    if (!force) {
      var ar_has_keys = ar_src.numKeys && ar_src.numKeys > 0;
      var ar_has_expr = ar_src.expression && ar_src.expression.length > 0;
      if (ar_has_keys || ar_has_expr) { return; }
    }
    var expr =
      'var d = thisComp.layer("' + escape_for_expr(base_layer.name) + '").text.sourceText.value;\n' +
      'var left = 0;\nvar right = 1;\n' +
      'try {\n  left = ParagraphJustification.LEFT_JUSTIFY;\n  right = ParagraphJustification.RIGHT_JUSTIFY;\n} catch (e) {}\n' +
      'if (d.justification == left) { d.justification = right; }\nd;';
    var ok = set_expression_checked(ar_src, expr, 'Source Text (' + arabic_layer.name + ')', errors);
    if (ok) {
      var base_text = get_textdocument_text(base_src);
      var ar_text = get_textdocument_text(ar_src);
      if (base_text !== null && ar_text !== null && base_text !== ar_text) {
        errors.push("Text link: expression set but evaluated text differs. Base='" + base_text + "' Arabic='" + ar_text + "'");
      }
    }
  };

  var link_layer_pair = function (comp, controller, selected_layer) {
    if (!selected_layer || !is_supported_layer(selected_layer)) {
      if (controller && controller.errors) { controller.errors.push("Skipped: unsupported layer type (name=" + (selected_layer ? selected_layer.name : "null") + ")"); }
      return;
    }
    if (selected_layer === controller.layer) {
      if (controller && controller.errors) { controller.errors.push("Skipped: selected layer is the controller (" + selected_layer.name + ")"); }
      return;
    }
    var selected_name = selected_layer.name;
    var base_name = selected_name;
    var arabic_name = selected_name + AR_SUFFIX;
    var base_layer = null;
    var arabic_layer = null;
    var arabic_created = false;
    if (ends_with(selected_name, AR_SUFFIX)) {
      arabic_name = selected_name;
      base_name = selected_name.substring(0, selected_name.length - AR_SUFFIX.length);
      arabic_layer = selected_layer;
      base_layer = find_layer_by_name(comp, base_name);
      if (!base_layer) {
        base_layer = arabic_layer.duplicate();
        base_layer.name = base_name;
        controller.stats.duplicated++;
      }
    } else {
      base_layer = selected_layer;
      arabic_layer = find_layer_by_name(comp, arabic_name);
      if (!arabic_layer) {
        arabic_layer = base_layer.duplicate();
        arabic_layer.name = arabic_name;
        arabic_created = true;
        controller.stats.duplicated++;
      }
    }
    ensure_gated_opacity(base_layer, controller, false, controller.errors);
    ensure_gated_opacity(arabic_layer, controller, true, controller.errors);
    ensure_text_link(base_layer, arabic_layer, arabic_created, controller.errors);
  };

  // ============================================================
  // ARABIC DUPLICATOR — UI
  // ============================================================

  var build_arabic_ui = function (container) {
    container.orientation = "column";
    container.alignChildren = ["fill", "top"];
    container.margins = 8;
    container.spacing = 6;

    var status = container.add("statictext", undefined, "Controller: (not set)", { multiline: true });
    status.minimumSize.height = 28;

    var btn_row = container.add("group");
    btn_row.orientation = "row";
    btn_row.alignChildren = ["fill", "center"];
    var btn_set = btn_row.add("button", undefined, "Set Controller");
    var btn_reset = btn_row.add("button", undefined, "Reset");

    var btn_duplicate = container.add("button", undefined, "Duplicate/Link Selected");

    var debug_row = container.add("group");
    debug_row.orientation = "row";
    debug_row.alignChildren = ["left", "center"];
    var debug_checkbox = debug_row.add("checkbox", undefined, "Debug alerts");
    debug_checkbox.value = DEBUG_ALERTS;
    debug_checkbox.onClick = function () { DEBUG_ALERTS = !!debug_checkbox.value; };

    var refresh_status = function () {
      var comp = get_active_comp();
      if (!controller_state.layer_name || !controller_state.checkbox_effect_name) {
        status.text = "Controller: (not set)";
        return;
      }
      var comp_name = comp ? comp.name : "(no active comp)";
      var controller = comp ? resolve_controller(comp) : null;
      var active_state = controller ? "ACTIVE" : "MISSING";
      var display_path =
        truncate_middle(comp_name, 22) + " > " +
        truncate_middle(controller_state.layer_name, 22) + " > " +
        truncate_middle(controller_state.checkbox_effect_name, 18);
      status.text = "Controller: " + active_state + "\n" + display_path;
    };

    btn_set.onClick = function () {
      var comp = get_active_comp();
      if (!comp) { alert("Open a comp and select the controller layer."); return; }
      if (comp.selectedLayers.length !== 1) { alert("Select exactly one layer to set as the controller."); return; }
      var layer = comp.selectedLayers[0];
      var checkbox_fx = get_first_checkbox_effect(layer);
      if (!checkbox_fx) { alert('That layer has no Checkbox Control effect. Add one, then click "Set Controller" again.'); return; }
      controller_state.comp_id = "" + comp.id;
      controller_state.layer_name = layer.name;
      controller_state.checkbox_effect_name = checkbox_fx.name;
      save_controller_state();
      refresh_status();
    };

    btn_reset.onClick = function () { reset_controller_state(); refresh_status(); };

    btn_duplicate.onClick = function () {
      var comp = get_active_comp();
      if (!comp) { alert("Open a comp and select layers to duplicate/link."); return; }
      if (comp.selectedLayers.length === 0) { alert("Select at least one layer to duplicate/link."); return; }
      var controller = resolve_controller(comp);
      if (!controller) { alert('Controller not set (or missing). Select the controller layer and click "Set Controller".'); return; }
      app.beginUndoGroup("PlainlySuite: Arabic Duplicate/Link");
      try {
        controller.errors = [];
        controller.stats = { selected: 0, duplicated: 0, processed: 0 };
        var selected = comp.selectedLayers;
        controller.stats.selected = selected.length;
        for (var i = 0; i < selected.length; i++) {
          link_layer_pair(comp, controller, selected[i]);
          controller.stats.processed++;
        }
        if (controller.errors.length > 0) {
          alert("Arabic Duplicator warnings/errors:\n\n- " + controller.errors.join("\n- "));
        } else if (DEBUG_ALERTS) {
          alert("Arabic Duplicator: completed.\n\nSelected: " + controller.stats.selected + "\nProcessed: " + controller.stats.processed);
        }
      } catch (e) {
        alert("Error: " + e.toString());
      } finally {
        app.endUndoGroup();
      }
    };

    load_controller_state();
    refresh_status();
  };

  // ============================================================
  // PARAMETER CREATOR — logic
  // ============================================================

  var pc_resolve_name = function (comp, baseName, reserved) {
    var candidate = "Plainly_" + baseName;
    var n = 2;
    while (reserved[candidate]) {
      candidate = "Plainly_" + baseName + "_" + n;
      n++;
    }
    return candidate;
  };

  var pc_build_reserved = function (comp) {
    var reserved = {};
    for (var i = 1; i <= comp.numLayers; i++) {
      try { reserved[comp.layer(i).name] = true; } catch (e) {}
    }
    return reserved;
  };

  // If a property has an active expression, evaluate its current value and return it
  // as a string to use as the Plainly name basis. Falls back to prop.name if the
  // evaluated value is empty, numeric (e.g. dropdown index), or throws.
  var pc_name_from_prop = function (prop) {
    try {
      if (prop.expressionEnabled && prop.expression && prop.expression !== "") {
        var val = prop.value;
        var str = "";
        if (val !== null && val !== undefined) {
          if (typeof val === "object" && val.text !== undefined) {
            str = val.text; // TextDocument
          } else if (typeof val === "string") {
            str = val;
          }
          // Intentionally skip numbers — dropdown indices are meaningless as names
        }
        if (str && str !== "") { return str; }
      }
    } catch (e) {}
    return prop.name;
  };

  // Returns the dropdown items array for a Dropdown Menu Control property, or null.
  // Uses propertyParameters (AE 2019+).
  var pc_get_dropdown_items = function (prop) {
    try {
      var params = prop.propertyParameters;
      if (params && params.items && params.items.length > 0) { return params.items; }
    } catch (e) {}
    return null;
  };

  // Writes an expression on a Dropdown Control that matches the Plainly guide layer's
  // text against the items array (case-insensitive), returning the 1-based index.
  // Falls back to 1 (first item) if no match.
  var pc_wire_dropdown_expression = function (prop, plainlyName, items) {
    var escaped = [];
    for (var i = 0; i < items.length; i++) {
      escaped.push('"' + items[i].replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"');
    }
    var expr = _read_label_expr(plainlyName) +
      'var items = [' + escaped.join(", ") + '];\n' +
      'var result = 1;\n' +
      'for (var i = 0; i < items.length; i++) {\n' +
      '  if (items[i].toLowerCase() === label) { result = i + 1; break; }\n' +
      '}\n' +
      'result;';
    try { prop.expression = expr; } catch (e) {}
  };

  // Create a Plainly guide text layer with static text content.
  var pc_create_layer = function (comp, plainlyName) {
    var lyr = comp.layers.addText(plainlyName);
    lyr.name = plainlyName;
    lyr.guideLayer = true;
    lyr.startTime = 0;
    lyr.outPoint = comp.duration;

    try {
      var td = lyr.property("Source Text").value;
      td.text = plainlyName;
      lyr.property("Source Text").setValue(td);
    } catch (e) {}

    // Red Fill effect for visibility
    try {
      var fill = lyr.property("ADBE Effect Parade").addProperty("ADBE Fill");
      fill.property("ADBE Fill-0002").setValue([1, 0, 0]);
    } catch (e) {}

    return lyr;
  };

  // Write an expression on the source property/layer that reads from the guide layer.
  var pc_wire_expression = function (prop, plainlyName) {
    var expr = 'thisComp.layer("' + escape_for_expr(plainlyName) + '").text.sourceText';
    try {
      prop.expression = expr;
    } catch (e) {}
  };

  // Robust string extraction shared by both numeric and dropdown expressions.
  var _read_label_expr = function (plainlyName) {
    var q = escape_for_expr(plainlyName);
    return (
      'var _raw = thisComp.layer("' + q + '").text.sourceText;\n' +
      'var label = (typeof _raw === "string") ? _raw\n' +
      '  : (_raw && _raw.value !== undefined)\n' +
      '    ? ((_raw.value.text !== undefined) ? _raw.value.text : String(_raw.value))\n' +
      '  : String(_raw);\n' +
      'label = label.toLowerCase();\n'
    );
  };

  // For numeric properties (sliders, index-type params) whose dropdown items could
  // not be read: reads the guide layer text as an integer, falling back to 1.
  var pc_wire_index_expression = function (prop, plainlyName) {
    var expr = _read_label_expr(plainlyName) +
      'var n = parseInt(label, 10);\n' +
      'isNaN(n) ? 1 : n;';
    try { prop.expression = expr; } catch (e) {}
  };

  // Flow-arrange guide layers in a grid starting from the top-left of the comp.
  // Uses sourceRectAtTime to measure each layer's actual text bounds so the layout
  // works for any comp size or font size.
  var pc_arrange_layers = function (comp, layers) {
    if (!layers || layers.length === 0) { return; }

    var PADDING  = 20;  // distance from comp edge
    var GAP_X    = 12;  // horizontal gap between items
    var GAP_Y    = 10;  // vertical gap between rows
    // Wrap to a new row when the row would exceed this fraction of the comp width
    var MAX_ROW_W = comp.width * 0.65;

    var curX = PADDING;
    var curY = PADDING;
    var rowH = 0;

    for (var i = 0; i < layers.length; i++) {
      var lyr = layers[i];
      var rect = null;
      try { rect = lyr.sourceRectAtTime(0, false); } catch (e) {}

      var w = (rect && rect.width  > 0) ? rect.width  : 120;
      var h = (rect && rect.height > 0) ? rect.height : 24;

      // Wrap to next row if this item won't fit (never wrap the very first item)
      if (i > 0 && curX + w > MAX_ROW_W) {
        curX = PADDING;
        curY += rowH + GAP_Y;
        rowH = 0;
      }

      // sourceRectAtTime gives bounds relative to the anchor point.
      // rect.left / rect.top are the offsets from anchor to the edges of the text box.
      // To place the top-left corner of the text box at (curX, curY):
      //   position = [curX - rect.left, curY - rect.top]
      var posX = rect ? (curX - rect.left) : curX;
      var posY = rect ? (curY - rect.top)  : curY;

      try { lyr.transform.position.setValue([posX, posY]); } catch (e) {}

      curX += w + GAP_X;
      if (h > rowH) { rowH = h; }
    }
  };

  // ============================================================
  // PARAMETER CREATOR — UI
  // ============================================================

  var build_param_creator_ui = function (container) {
    container.orientation = "column";
    container.alignChildren = ["fill", "top"];
    container.margins = 8;
    container.spacing = 8;

    var info = container.add("statictext", undefined,
      "Select properties or text layers in the timeline, then click the button below.",
      { multiline: true });
    info.minimumSize.height = 34;

    var btn = container.add("button", undefined, "Create Plainly Parameter Layers");
    btn.preferredSize = [-1, 30];

    var status = container.add("statictext", undefined, "");
    status.alignment = ["fill", "center"];
    status.characters = 50;
    status.justify = "center";

    btn.onClick = function () {
      var comp = app.project && app.project.activeItem;
      if (!comp || !(comp instanceof CompItem)) {
        status.text = "No active composition.";
        return;
      }

      // Each entry: { name: string, prop: Property|null, layer: Layer|null }
      var entries = [];

      // From selected properties in the timeline
      try {
        var props = comp.selectedProperties;
        for (var i = 0; i < props.length; i++) {
          var p = props[i];
          if (p && p.name) {
            var dropItems = pc_get_dropdown_items(p);
            var isNumeric = false;
            try { isNumeric = (typeof p.value === "number"); } catch (e) {}
            entries.push({
              name: pc_name_from_prop(p),
              prop: p,
              layer: null,
              dropdownItems: dropItems,
              isNumeric: isNumeric
            });
          }
        }
      } catch (e) {}

      // From selected text layers — wire the Source Text property
      try {
        var layers = comp.selectedLayers;
        for (var i = 0; i < layers.length; i++) {
          var lyr = layers[i];
          if (lyr instanceof TextLayer) {
            var srcProp = null;
            try { srcProp = lyr.property("Source Text"); } catch (e) {}
            var name = srcProp ? pc_name_from_prop(srcProp) : lyr.name;
            entries.push({ name: name, prop: srcProp, layer: lyr, dropdownItems: null });
          }
        }
      } catch (e) {}

      if (entries.length === 0) {
        status.text = "Select properties or text layers first.";
        return;
      }

      var reserved = pc_build_reserved(comp);
      var created = 0;
      var errors = [];
      var createdLayers = [];

      app.beginUndoGroup("PlainlySuite: Create Parameter Layers");
      try {
        for (var i = 0; i < entries.length; i++) {
          try {
            var plainlyName = pc_resolve_name(comp, entries[i].name, reserved);
            reserved[plainlyName] = true;
            var newLyr = pc_create_layer(comp, plainlyName);
            if (entries[i].prop) {
              if (entries[i].dropdownItems) {
                pc_wire_dropdown_expression(entries[i].prop, plainlyName, entries[i].dropdownItems);
              } else if (entries[i].isNumeric) {
                // Numeric property (slider, index, EG menu) whose items couldn't be read.
                // Expression reads the guide layer text as an integer; type "1", "2", etc.
                pc_wire_index_expression(entries[i].prop, plainlyName);
              } else {
                pc_wire_expression(entries[i].prop, plainlyName);
              }
            }
            createdLayers.push(newLyr);
            created++;
          } catch (e) {
            errors.push(entries[i].name + ": " + e.message);
          }
        }
        // Arrange all newly created layers in a top-left grid
        pc_arrange_layers(comp, createdLayers);
      } catch (e) {
        errors.push("Unexpected error: " + e.message);
      }
      app.endUndoGroup();

      if (errors.length > 0) {
        status.text = "Created " + created + " layer(s). " + errors.length + " error(s).";
      } else {
        status.text = "Created " + created + " layer" + (created !== 1 ? "s" : "") + ".";
      }
    };
  };

  // ============================================================
  // RENDERER CHECK — logic + UI
  // ============================================================

  var CLASSIC_3D_RENDERER = "ADBE Ernst";

  var _renderer_label = function (r) {
    if (r === "ADBE Ernst")       { return "Classic 3D"; }
    if (r === "ADBE Advanced 3d") { return "Advanced 3D"; }
    if (r === "ADBE cinema4d")    { return "Cinema 4D"; }
    return r || "Unknown";
  };

  var build_renderer_check_ui = function (container) {
    container.orientation    = "column";
    container.alignChildren  = ["fill", "top"];
    container.margins        = 8;
    container.spacing        = 6;

    var scanBtn = container.add("button", undefined, "Scan Project");

    var list = container.add("listbox", undefined, undefined, {
      numberOfColumns: 2,
      columnTitles:    ["Comp", "Renderer"],
      multiselect:     true
    });
    list.alignment = ["fill", "fill"];

    var btnRow = container.add("group");
    btnRow.orientation   = "row";
    btnRow.alignChildren = ["fill", "center"];
    btnRow.spacing       = 6;

    var fixSelBtn = btnRow.add("button", undefined, "Fix Selected");
    var fixAllBtn = btnRow.add("button", undefined, "Fix All");

    var status = container.add("statictext", undefined, "Click Scan to begin.");
    status.alignment = ["fill", "bottom"];

    // ---- data store ----
    var _found = []; // [{ comp, renderer }]

    var _rebuild_list = function () {
      list.removeAll();
      for (var i = 0; i < _found.length; i++) {
        var entry = _found[i];
        var item  = list.add("item", entry.comp.name);
        item.subItems[0].text = _renderer_label(entry.renderer);
      }
    };

    var _scan = function () {
      _found = [];
      if (!app.project) { status.text = "No project open."; return; }
      try {
        for (var i = 1; i <= app.project.numItems; i++) {
          try {
            var item = app.project.item(i);
            if (!(item instanceof CompItem)) { continue; }
            var r = "";
            try { r = item.renderer; } catch(e) {}
            if (r !== CLASSIC_3D_RENDERER) {
              _found.push({ comp: item, renderer: r });
            }
          } catch(e) {}
        }
      } catch(e) {}
      _rebuild_list();
      if (_found.length === 0) {
        status.text = "All comps use Classic 3D.";
      } else {
        status.text = _found.length + " comp" + (_found.length !== 1 ? "s" : "") + " not using Classic 3D.";
      }
    };

    var _fix_entries = function (entries) {
      if (entries.length === 0) { status.text = "Nothing to fix."; return; }
      var fixed = 0;
      var errors = [];
      app.beginUndoGroup("PlainlySuite: Switch to Classic 3D");
      for (var i = 0; i < entries.length; i++) {
        try {
          entries[i].comp.renderer = CLASSIC_3D_RENDERER;
          fixed++;
        } catch(e) {
          errors.push(entries[i].comp.name + ": " + e.message);
        }
      }
      app.endUndoGroup();
      _scan();
      if (errors.length > 0) {
        status.text = "Fixed " + fixed + ". Errors: " + errors.length;
      } else {
        status.text = "Fixed " + fixed + " comp" + (fixed !== 1 ? "s" : "") + ".";
      }
    };

    scanBtn.onClick = _scan;

    fixSelBtn.onClick = function () {
      var sel = [];
      for (var i = 0; i < list.items.length; i++) {
        if (list.items[i].selected) { sel.push(_found[i]); }
      }
      _fix_entries(sel);
    };

    fixAllBtn.onClick = function () { _fix_entries(_found); };
  };

  // ============================================================
  // MAIN — build tabbed panel
  // ============================================================

  var win = (thisObj instanceof Panel)
    ? thisObj
    : new Window("palette", "Plainly Suite", undefined, { resizable: true });

  win.orientation = "column";
  win.alignChildren = ["fill", "fill"];
  win.margins = 0;
  win.spacing = 0;

  var tabs = win.add("tabbedpanel");
  tabs.alignment = ["fill", "fill"];

  var arabicTab   = tabs.add("tab", undefined, "Arabic Duplicator");
  var paramTab    = tabs.add("tab", undefined, "Parameter Creator");
  var rendererTab = tabs.add("tab", undefined, "Renderer Check");

  build_arabic_ui(arabicTab);
  build_param_creator_ui(paramTab);
  build_renderer_check_ui(rendererTab);

  win.onResizing = win.onResize = function () { this.layout.resize(); };

  if (win instanceof Window) {
    win.center();
    win.show();
  } else {
    win.layout.layout(true);
  }

})(this);
