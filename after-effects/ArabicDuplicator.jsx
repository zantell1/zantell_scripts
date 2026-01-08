/*
ArabicDuplicator.jsx
Dockable ScriptUI panel for After Effects that:
- Lets you set a controller layer (first Checkbox Control effect on that layer)
- Duplicates/links selected layers with an Arabic suffix and opacity gating
*/

(function ArabicDuplicator(this_obj) {
  var SCRIPT_NAME = "Arabic Duplicator";
  var SETTINGS_SECTION = "ArabicDuplicator";
  var AR_SUFFIX = "(_ARABIC)";
  var BASE_OPACITY_EFFECT_NAME = "ARABIC_BaseOpacity"; // Transform effect we own/manage
  var DEBUG_ALERTS = false;

  var controller_state = {
    comp_id: null,
    layer_name: null,
    checkbox_effect_name: null
  };

  var escape_for_expr = function (s) {
    if (s === null || s === undefined) {
      return "";
    }
    return ("" + s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  };

  var truncate_middle = function (s, max_len) {
    if (!s) {
      return "";
    }
    if (s.length <= max_len) {
      return s;
    }
    if (max_len <= 3) {
      return s.substring(0, max_len);
    }
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
    } catch (e2) {
      // ignore
    }
    return true;
  };

  var get_textdocument_text = function (prop) {
    if (!prop) {
      return null;
    }
    try {
      var td = prop.value; // TextDocument
      if (!td) {
        return null;
      }
      return td.text;
    } catch (e) {
      return null;
    }
  };

  var is_comp_active = function () {
    return app.project && app.project.activeItem && (app.project.activeItem instanceof CompItem);
  };

  var get_active_comp = function () {
    if (!is_comp_active()) {
      return null;
    }
    return app.project.activeItem;
  };

  var find_layer_by_name = function (comp, name) {
    if (!comp || !name) {
      return null;
    }
    for (var i = 1; i <= comp.numLayers; i++) {
      var lyr = comp.layer(i);
      if (lyr && lyr.name === name) {
        return lyr;
      }
    }
    return null;
  };

  var get_first_checkbox_effect = function (layer) {
    if (!layer) {
      return null;
    }
    var fx_parade = layer.property("ADBE Effect Parade");
    if (!fx_parade) {
      return null;
    }
    for (var i = 1; i <= fx_parade.numProperties; i++) {
      var fx = fx_parade.property(i);
      if (fx && fx.matchName === "ADBE Checkbox Control") {
        return fx;
      }
    }
    return null;
  };

  var save_controller_state = function () {
    try {
      app.settings.saveSetting(SETTINGS_SECTION, "comp_id", controller_state.comp_id ? ("" + controller_state.comp_id) : "");
      app.settings.saveSetting(SETTINGS_SECTION, "layer_name", controller_state.layer_name ? controller_state.layer_name : "");
      app.settings.saveSetting(SETTINGS_SECTION, "checkbox_effect_name", controller_state.checkbox_effect_name ? controller_state.checkbox_effect_name : "");
    } catch (e) {
      // ignore settings failures; still works during session
    }
  };

  var load_controller_state = function () {
    try {
      if (app.settings.haveSetting(SETTINGS_SECTION, "comp_id")) {
        var comp_id = app.settings.getSetting(SETTINGS_SECTION, "comp_id");
        controller_state.comp_id = comp_id ? comp_id : null;
      }
      if (app.settings.haveSetting(SETTINGS_SECTION, "layer_name")) {
        var layer_name = app.settings.getSetting(SETTINGS_SECTION, "layer_name");
        controller_state.layer_name = layer_name ? layer_name : null;
      }
      if (app.settings.haveSetting(SETTINGS_SECTION, "checkbox_effect_name")) {
        var fx_name = app.settings.getSetting(SETTINGS_SECTION, "checkbox_effect_name");
        controller_state.checkbox_effect_name = fx_name ? fx_name : null;
      }
    } catch (e) {
      // ignore
    }
  };

  var reset_controller_state = function () {
    controller_state.comp_id = null;
    controller_state.layer_name = null;
    controller_state.checkbox_effect_name = null;
    save_controller_state();
  };

  var resolve_controller = function (comp) {
    if (!controller_state.layer_name || !controller_state.checkbox_effect_name) {
      return null;
    }
    if (!comp) {
      return null;
    }
    var layer = find_layer_by_name(comp, controller_state.layer_name);
    if (!layer) {
      return null;
    }
    var fx_parade = layer.property("ADBE Effect Parade");
    if (!fx_parade) {
      return null;
    }
    var checkbox_fx = fx_parade.property(controller_state.checkbox_effect_name);
    if (!checkbox_fx || checkbox_fx.matchName !== "ADBE Checkbox Control") {
      return null;
    }
    return { layer: layer, checkbox_effect_name: controller_state.checkbox_effect_name };
  };

  var is_supported_layer = function (layer) {
    // In some AE versions, TextLayer/ShapeLayer may not satisfy `instanceof AVLayer` reliably.
    // We treat anything duplicable that's not a camera/light as supported.
    if (!layer) {
      return false;
    }
    try {
      if (!layer.duplicate) {
        return false;
      }
      var mn = layer.matchName;
      if (mn === "ADBE Camera Layer" || mn === "ADBE Light Layer") {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  var ends_with = function (s, suffix) {
    if (!s || !suffix) {
      return false;
    }
    return s.indexOf(suffix, s.length - suffix.length) !== -1;
  };

  var find_or_add_transform_effect = function (layer) {
    var fx_parade = layer.property("ADBE Effect Parade");
    if (!fx_parade) {
      return null;
    }

    // Prefer an existing effect we own.
    var existing_by_name = fx_parade.property(BASE_OPACITY_EFFECT_NAME);
    if (existing_by_name) {
      return existing_by_name;
    }

    // Otherwise add a Transform effect and rename it.
    var candidates = ["ADBE Geometry2", "ADBE Transform Group", "ADBE Transform"];
    var created = null;

    for (var i = 0; i < candidates.length; i++) {
      try {
        created = fx_parade.addProperty(candidates[i]);
      } catch (e) {
        created = null;
      }
      if (created) {
        break;
      }
    }

    if (!created) {
      return null;
    }

    try {
      created.name = BASE_OPACITY_EFFECT_NAME;
    } catch (e) {
      // If rename fails, still return it, but expressions will be more fragile.
    }
    return created;
  };

  var find_effect_opacity_property = function (fx) {
    if (!fx) {
      return null;
    }

    // Try common/expected property names first.
    var by_name = null;
    try {
      by_name = fx.property("Opacity");
    } catch (e) {
      by_name = null;
    }
    if (by_name && by_name.canSetExpression) {
      return by_name;
    }

    // Heuristic: find a 1D percent-like property (0..100) that can be expressed.
    for (var i = 1; i <= fx.numProperties; i++) {
      var p = fx.property(i);
      if (!p || !p.canSetExpression) {
        continue;
      }
      if (p.propertyValueType !== PropertyValueType.OneD) {
        continue;
      }
      if (p.hasMin && p.hasMax && p.minValue === 0 && p.maxValue === 100) {
        return p;
      }
    }

    // Fallback: first 1D prop that can take expression.
    for (var j = 1; j <= fx.numProperties; j++) {
      var p2 = fx.property(j);
      if (p2 && p2.canSetExpression && p2.propertyValueType === PropertyValueType.OneD) {
        return p2;
      }
    }

    return null;
  };

  var clear_property_animation = function (prop) {
    if (!prop) {
      return;
    }
    try {
      if (prop.canSetExpression) {
        prop.expression = "";
        prop.expressionEnabled = false;
      }
    } catch (e) {}
    try {
      if (prop.numKeys && prop.numKeys > 0) {
        for (var i = prop.numKeys; i >= 1; i--) {
          prop.removeKey(i);
        }
      }
    } catch (e2) {}
  };

  var move_opacity_animation_to_effect = function (layer, transform_opacity, fx_opacity, force_overwrite) {
    // If we're writing into our owned effect, it's safe to overwrite its animation.
    if (force_overwrite) {
      clear_property_animation(fx_opacity);
    } else {
      // Only move if the destination looks unused.
      var dest_has_expr = fx_opacity.canSetExpression && fx_opacity.expression && fx_opacity.expression.length > 0;
      var dest_has_keys = fx_opacity.numKeys && fx_opacity.numKeys > 0;
      if (dest_has_expr || dest_has_keys) {
        return false;
      }
    }

    // Move expression if present.
    var src_has_expr = transform_opacity.canSetExpression && transform_opacity.expression && transform_opacity.expression.length > 0;
    if (src_has_expr) {
      fx_opacity.expression = transform_opacity.expression;
      fx_opacity.expressionEnabled = transform_opacity.expressionEnabled;
      transform_opacity.expression = "";
      transform_opacity.expressionEnabled = false;
      return true;
    }

    // Move keyframes if present.
    if (transform_opacity.numKeys && transform_opacity.numKeys > 0) {
      var n = transform_opacity.numKeys;

      for (var k = 1; k <= n; k++) {
        var t = transform_opacity.keyTime(k);
        var v = transform_opacity.keyValue(k);
        fx_opacity.setValueAtTime(t, v);

        try {
          fx_opacity.setInterpolationTypeAtKey(k, transform_opacity.keyInInterpolationType(k), transform_opacity.keyOutInterpolationType(k));
        } catch (e) {}

        try {
          fx_opacity.setTemporalEaseAtKey(k, transform_opacity.keyInTemporalEase(k), transform_opacity.keyOutTemporalEase(k));
        } catch (e) {}

        try {
          fx_opacity.setTemporalContinuousAtKey(k, transform_opacity.keyTemporalContinuous(k));
          fx_opacity.setTemporalAutoBezierAtKey(k, transform_opacity.keyTemporalAutoBezier(k));
        } catch (e) {}
      }

      for (var r = transform_opacity.numKeys; r >= 1; r--) {
        transform_opacity.removeKey(r);
      }

      return true;
    }

    return false;
  };

  var ensure_gated_opacity = function (layer, controller, show_when_checked, errors) {
    var transform_group = layer.property("ADBE Transform Group");
    if (!transform_group) {
      return;
    }
    var opacity_prop = transform_group.property("ADBE Opacity");
    if (!opacity_prop || !opacity_prop.canSetExpression) {
      return;
    }

    var needs_preserve = (opacity_prop.numKeys && opacity_prop.numKeys > 0) || (opacity_prop.expression && opacity_prop.expression.length > 0);
    var base_ref = "value";

    if (needs_preserve) {
      var fx = find_or_add_transform_effect(layer);
      if (fx) {
        var fx_opacity = find_effect_opacity_property(fx);
        if (fx_opacity) {
          // Move current opacity animation/expression into the effect if possible.
          var moved = move_opacity_animation_to_effect(
            layer,
            opacity_prop,
            fx_opacity,
            fx.name === BASE_OPACITY_EFFECT_NAME
          );
          if (moved || fx.name === BASE_OPACITY_EFFECT_NAME) {
            base_ref = 'effect("' + escape_for_expr(fx.name) + '")("Opacity")';
          }
        }
      }
    }

    var c_expr =
      'thisComp.layer("' +
      escape_for_expr(controller.layer.name) +
      '").effect("' +
      escape_for_expr(controller.checkbox_effect_name) +
      '")("Checkbox")';

    var multiplier = show_when_checked ? "c" : "(1-c)";

    var expr =
      'var c = ' + c_expr + ';\n' +
      'var base = ' + base_ref + ';\n' +
      'base * ' + multiplier + ';';

    set_expression_checked(
      opacity_prop,
      expr,
      'Opacity (' + layer.name + ')',
      errors
    );
  };

  var get_source_text_prop = function (layer) {
    if (!layer) {
      return null;
    }
    try {
      // Text layers expose .property("ADBE Text Properties")("ADBE Text Document")
      var text_props = layer.property("ADBE Text Properties");
      if (!text_props) {
        return null;
      }
      var src = text_props.property("ADBE Text Document");
      return src ? src : null;
    } catch (e) {
      return null;
    }
  };

  var ensure_text_link = function (base_layer, arabic_layer, force, errors) {
    // If both are text layers, make the Arabic layer's Source Text follow the base layer's Source Text.
    // Non-destructive by default: don't overwrite if Arabic already has keys or an expression.
    if (!base_layer || !arabic_layer) {
      return;
    }
    var base_src = get_source_text_prop(base_layer);
    var ar_src = get_source_text_prop(arabic_layer);
    if (!base_src || !ar_src || !ar_src.canSetExpression) {
      if (!base_src) {
        errors.push("Text link: base layer is not a text layer (" + base_layer.name + ")");
      }
      if (!ar_src) {
        errors.push("Text link: arabic layer is not a text layer (" + arabic_layer.name + ")");
      }
      if (ar_src && !ar_src.canSetExpression) {
        errors.push("Text link: cannot set expression on Source Text (" + arabic_layer.name + ")");
      }
      return;
    }

    if (!force) {
      var ar_has_keys = ar_src.numKeys && ar_src.numKeys > 0;
      var ar_has_expr = ar_src.expression && ar_src.expression.length > 0;
      if (ar_has_keys || ar_has_expr) {
        return;
      }
    }

    var expr =
      'var d = thisComp.layer("' +
      escape_for_expr(base_layer.name) +
      '").text.sourceText.value;\n' +
      'var left = 0;\n' +
      'var right = 1;\n' +
      'try {\n' +
      '  left = ParagraphJustification.LEFT_JUSTIFY;\n' +
      '  right = ParagraphJustification.RIGHT_JUSTIFY;\n' +
      '} catch (e) {}\n' +
      'if (d.justification == left) { d.justification = right; }\n' +
      'd;';

    var ok = set_expression_checked(
      ar_src,
      expr,
      'Source Text (' + arabic_layer.name + ')',
      errors
    );

    if (ok) {
      var base_text = get_textdocument_text(base_src);
      var ar_text = get_textdocument_text(ar_src);
      if (base_text !== null && ar_text !== null && base_text !== ar_text) {
        errors.push(
          "Text link: expression set but evaluated text differs. Base='" +
            base_text +
            "' Arabic='" +
            ar_text +
            "'"
        );
      }
    }
  };

  var link_layer_pair = function (comp, controller, selected_layer) {
    if (!selected_layer || !is_supported_layer(selected_layer)) {
      if (controller && controller.errors) {
        controller.errors.push("Skipped: unsupported layer type (name=" + (selected_layer ? selected_layer.name : "null") + ")");
      }
      return;
    }
    if (selected_layer === controller.layer) {
      if (controller && controller.errors) {
        controller.errors.push("Skipped: selected layer is the controller (" + selected_layer.name + ")");
      }
      return;
    }

    var selected_name = selected_layer.name;
    var base_name = selected_name;
    var arabic_name = selected_name + AR_SUFFIX;

    var base_layer = null;
    var arabic_layer = null;
    var arabic_created = false;
    var base_created = false;

    if (ends_with(selected_name, AR_SUFFIX)) {
      arabic_name = selected_name;
      base_name = selected_name.substring(0, selected_name.length - AR_SUFFIX.length);
      arabic_layer = selected_layer;
      base_layer = find_layer_by_name(comp, base_name);
      if (!base_layer) {
        base_layer = arabic_layer.duplicate();
        base_layer.name = base_name;
        base_created = true;
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

    // Original (base) visible when checkbox is OFF; Arabic visible when ON.
    ensure_gated_opacity(base_layer, controller, false, controller.errors);
    ensure_gated_opacity(arabic_layer, controller, true, controller.errors);

    // If these are text layers, link Arabic source text to base source text.
    // If we just created the Arabic layer, force the link so future edits to base propagate.
    ensure_text_link(base_layer, arabic_layer, arabic_created, controller.errors);
  };

  var build_ui = function (this_obj) {
    var panel = (this_obj instanceof Panel) ? this_obj : new Window("palette", SCRIPT_NAME, undefined, { resizeable: true });

    panel.orientation = "column";
    panel.alignChildren = ["fill", "top"];

    var status = panel.add("statictext", undefined, "Controller: (not set)", { multiline: true });
    status.minimumSize.height = 28;

    var btn_row = panel.add("group");
    btn_row.orientation = "row";
    btn_row.alignChildren = ["fill", "center"];

    var btn_set = btn_row.add("button", undefined, "Set Controller");
    var btn_reset = btn_row.add("button", undefined, "Reset");

    var btn_duplicate = panel.add("button", undefined, "Duplicate/Link Selected");
    var debug_row = panel.add("group");
    debug_row.orientation = "row";
    debug_row.alignChildren = ["left", "center"];
    var debug_checkbox = debug_row.add("checkbox", undefined, "Debug alerts");
    debug_checkbox.value = DEBUG_ALERTS;
    debug_checkbox.onClick = function () {
      DEBUG_ALERTS = !!debug_checkbox.value;
    };

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
        truncate_middle(comp_name, 22) +
        " > " +
        truncate_middle(controller_state.layer_name, 22) +
        " > " +
        truncate_middle(controller_state.checkbox_effect_name, 18);

      status.text = "Controller: " + active_state + "\n" + display_path;
    };

    btn_set.onClick = function () {
      var comp = get_active_comp();
      if (!comp) {
        alert("Open a comp and select the controller layer.");
        return;
      }
      if (comp.selectedLayers.length !== 1) {
        alert("Select exactly one layer to set as the controller.");
        return;
      }
      var layer = comp.selectedLayers[0];
      var checkbox_fx = get_first_checkbox_effect(layer);
      if (!checkbox_fx) {
        alert('That layer has no Checkbox Control effect. Add one, then click "Set Controller" again.');
        return;
      }

      controller_state.comp_id = "" + comp.id;
      controller_state.layer_name = layer.name;
      controller_state.checkbox_effect_name = checkbox_fx.name;
      save_controller_state();
      refresh_status();
    };

    btn_reset.onClick = function () {
      reset_controller_state();
      refresh_status();
    };

    btn_duplicate.onClick = function () {
      var comp = get_active_comp();
      if (!comp) {
        alert("Open a comp and select layers to duplicate/link.");
        return;
      }
      if (comp.selectedLayers.length === 0) {
        alert("Select at least one layer to duplicate/link.");
        return;
      }

      var controller = resolve_controller(comp);
      if (!controller) {
        alert('Controller not set (or missing). Select the controller layer and click "Set Controller".');
        return;
      }

      app.beginUndoGroup("Arabic Duplicate/Link");
      try {
        controller.errors = [];
        controller.stats = {
          selected: 0,
          skipped_controller: 0,
          skipped_unsupported: 0,
          duplicated: 0,
          processed: 0
        };
        var selected = comp.selectedLayers;
        controller.stats.selected = selected.length;
        for (var i = 0; i < selected.length; i++) {
          link_layer_pair(comp, controller, selected[i]);
          controller.stats.processed++;
        }
        if (controller.errors.length > 0) {
          alert("ArabicDuplicator warnings/errors:\n\n- " + controller.errors.join("\n- "));
        } else if (DEBUG_ALERTS) {
          alert(
            "ArabicDuplicator: completed.\n\n" +
              "Selected: " +
              controller.stats.selected +
              "\nProcessed: " +
              controller.stats.processed +
              "\n\n(If a layer didn't duplicate, its name may already exist with (_ARABIC), or it may have been skipped.)"
          );
        }
      } catch (e) {
        alert("Error: " + e.toString());
      } finally {
        app.endUndoGroup();
      }
    };

    panel.onResizing = panel.onResize = function () {
      this.layout.resize();
    };

    load_controller_state();
    refresh_status();

    panel.layout.layout(true);
    return panel;
  };

  var my_panel = build_ui(this_obj);
  if (my_panel instanceof Window) {
    my_panel.center();
    my_panel.show();
  }
})(this);


