(function () {
  "use strict";

  var data = window.__BRAND__ || {};
  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  // ---------- formatting ----------
  var fmtEUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  var fmtEUR2 = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });

  function parseNum(str) {
    if (str == null) return NaN;
    var cleaned = String(str).trim().replace(/\./g, "").replace(",", ".");
    return parseFloat(cleaned);
  }

  // ============================================================
  // MOTORES DE CÁLCULO — verificados, no tocar sin re-verificar
  // ============================================================

  // ---------- amortization engine (French system) ----------
  // Verified case: P=100000, annual=5%, years=20 -> monthly ~659.96, matches
  // standard French-amortization tables (hand-checked comment, do not remove).
  function frenchAmortization(P, annualRatePct, months) {
    var r = (annualRatePct / 100) / 12;
    var n = Math.round(months);
    var cuota = r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n));
    var schedule = [];
    var pendiente = P;
    var totalInteres = 0;
    for (var m = 1; m <= n; m++) {
      var interes = pendiente * r;
      var capitalMes = cuota - interes;
      pendiente = Math.max(0, pendiente - capitalMes);
      totalInteres += interes;
      schedule.push({ mes: m, cuota: cuota, interes: interes, capital: capitalMes, pendiente: pendiente });
    }
    return {
      cuota: cuota,
      totalPagado: cuota * n,
      totalInteres: totalInteres,
      schedule: schedule
    };
  }

  // ---------- compound interest engine ----------
  // Verified case: initial=1000, monthly=0, annual=12%, years=1 (r=1%/mes)
  // -> balance ~1000*(1.01)^12 = 1126.83, matches hand calculation.
  function compoundGrowth(initial, aportacionMensual, annualRatePct, months) {
    var r = (annualRatePct / 100) / 12;
    var balance = initial;
    var totalAportado = initial;
    var schedule = [];
    for (var m = 1; m <= months; m++) {
      var interes = balance * r;
      balance = balance + interes + aportacionMensual;
      totalAportado += aportacionMensual;
      schedule.push({ mes: m, balance: balance, aportado: totalAportado, interes: balance - totalAportado });
    }
    return {
      balanceFinal: balance,
      totalAportado: totalAportado,
      totalInteres: balance - totalAportado,
      schedule: schedule
    };
  }

  // ---------- canvas stacked-area chart (no lib) ----------
  function drawStackedChart(canvas, seriesBottom, seriesTop, xCount) {
    if (!canvas || !canvas.getContext) return;
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(240, rect.width), h = canvas.clientHeight || 220;
    canvas.width = w * dpr; canvas.height = h * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    var padL = 46, padB = 26, padT = 10, padR = 10;
    var plotW = w - padL - padR, plotH = h - padT - padB;
    var maxVal = 0;
    for (var i = 0; i < xCount; i++) {
      maxVal = Math.max(maxVal, (seriesBottom.data[i] || 0) + (seriesTop.data[i] || 0));
    }
    if (maxVal <= 0) maxVal = 1;

    var styles = getComputedStyle(document.documentElement);
    var lineCol = styles.getPropertyValue("--line").trim() || "#e2e8e4";
    var inkSoft = styles.getPropertyValue("--ink-soft").trim() || "#56635d";
    var sansFont = (styles.getPropertyValue("--sans") || "sans-serif").trim();

    ctx.strokeStyle = lineCol; ctx.lineWidth = 1; ctx.font = "11px " + sansFont;
    ctx.fillStyle = inkSoft;
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (plotH * g) / 4;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke();
      var val = maxVal * (1 - g / 4);
      ctx.fillText(fmtCompact(val), 2, gy + 3);
    }

    function xAt(i) { return padL + (plotW * i) / Math.max(1, xCount - 1); }
    function yAt(v) { return padT + plotH - (plotH * v) / maxVal; }

    // x-axis year labels — legibility gap fixed: without these the chart had
    // no time reference at all. Show first, middle and last year only, so
    // labels never overlap even on narrow mobile screens.
    ctx.font = "11px " + sansFont;
    ctx.fillStyle = inkSoft;
    ctx.textAlign = "center";
    var xTickIdx = xCount <= 2 ? [0, xCount - 1] : [0, Math.round((xCount - 1) / 2), xCount - 1];
    xTickIdx.forEach(function (idx, pos) {
      if (idx < 0 || idx >= xCount) return;
      var align = pos === 0 ? "left" : (pos === xTickIdx.length - 1 ? "right" : "center");
      ctx.textAlign = align;
      ctx.fillText("Año " + (idx + 1), xAt(idx), h - 6);
    });
    ctx.textAlign = "left";

    drawArea(seriesBottom.data, seriesBottom.color, 0);
    var stackedTop = seriesTop.data.map(function (v, i) { return v + (seriesBottom.data[i] || 0); });
    drawArea(stackedTop, seriesTop.color, seriesBottom.data);

    function drawArea(vals, color, base) {
      ctx.beginPath();
      for (var i = 0; i < xCount; i++) { var x = xAt(i), y = yAt(vals[i] || 0); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      for (var j = xCount - 1; j >= 0; j--) {
        var bv = base === 0 ? 0 : (base[j] || 0);
        ctx.lineTo(xAt(j), yAt(bv));
      }
      ctx.closePath();
      ctx.fillStyle = color + "33";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (var k = 0; k < xCount; k++) { var x2 = xAt(k), y2 = yAt(vals[k] || 0); if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2); }
      ctx.stroke();
    }
  }

  function fmtCompact(v) {
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace(".0", "") + "M";
    if (v >= 1000) return (v / 1000).toFixed(0) + "k";
    return Math.round(v).toString();
  }

  // ---------- table renderer (virtualized: render first N + "ver más") ----------
  function renderAmortTable(container, schedule, kind) {
    if (!container) return;
    var CHUNK = 24;
    var shown = CHUNK;
    function rows(list) {
      return list.map(function (r) {
        if (kind === "loan") {
          return "<tr><td>" + r.mes + "</td><td>" + fmtEUR2.format(r.cuota) + "</td><td>" + fmtEUR2.format(r.capital) + "</td><td>" + fmtEUR2.format(r.interes) + "</td><td>" + fmtEUR2.format(r.pendiente) + "</td></tr>";
        }
        return "<tr><td>" + r.mes + "</td><td>" + fmtEUR2.format(r.aportado) + "</td><td>" + fmtEUR2.format(r.interes) + "</td><td>" + fmtEUR2.format(r.balance) + "</td></tr>";
      }).join("");
    }
    function paint() {
      var head = kind === "loan"
        ? "<thead><tr><th>Mes</th><th>Cuota</th><th>Capital</th><th>Interés</th><th>Pendiente</th></tr></thead>"
        : "<thead><tr><th>Mes</th><th>Aportado</th><th>Interés</th><th>Saldo</th></tr></thead>";
      container.innerHTML = "<table class=\"amort\">" + head + "<tbody>" + rows(schedule.slice(0, shown)) + "</tbody></table>" +
        (shown < schedule.length ? "<button type=\"button\" class=\"btn btn-ghost btn-block\" data-ver-mas style=\"margin-top:.8rem\">Ver más filas</button>" : "");
      var btn = $("[data-ver-mas]", container);
      if (btn) btn.addEventListener("click", function () { shown += CHUNK * 3; paint(); });
    }
    paint();
  }

  // ============================================================
  // ICONOS (SVG inline reutilizables)
  // ============================================================
  var ICONS = {
    calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/><line x1="16" y1="10" x2="16" y2="10.01"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="16" y2="18"/></svg>',
    house: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-3Z"/><circle cx="17" cy="14" r="1.4"/></svg>',
    growth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="14 6 21 6 21 13"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2 0-6-1-6-3.5S8.5 2 10 3.5 12 6 12 8Z"/><path d="M12 8c2 0 6-1 6-3.5S15.5 2 14 3.5 12 6 12 8Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 9 17 20 6"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
    chevron: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',
    menu: '<svg class="icon-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
    close: '<svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    percent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  };

  // ============================================================
  // MENÚ MÓVIL
  // ============================================================
  function initMobileMenu() {
    var toggle = $("#nav-toggle");
    var panel = $("#mobile-nav-panel");
    var scrim = $("#nav-scrim");
    if (!toggle || !panel) return;

    function open() {
      panel.classList.add("is-open");
      if (scrim) scrim.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
    }
    function close() {
      panel.classList.remove("is-open");
      if (scrim) scrim.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
    }
    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) close(); else open();
    });
    if (scrim) scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    panel.addEventListener("click", function (e) { if (e.target.closest("a")) close(); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 960) close(); });
  }

  // ============================================================
  // MOUNTS (nav, faq, tools grid, año)
  // ============================================================
  function mountNav() {
    if (!data.nav) return;
    var here = (location.pathname.split("/").pop() || "index.html");
    $$("[data-nav]").forEach(function (nav) {
      if (nav.children.length) return;
      nav.innerHTML = data.nav.map(function (n) {
        var current = n.href === here ? " aria-current=\"page\"" : "";
        return "<a href=\"" + n.href + "\"" + current + ">" + escHTML(n.label) + "</a>";
      }).join("");
    });
  }

  var TOOL_ICON_BY_ID = { hipoteca: ICONS.house, "prestamo-personal": ICONS.wallet, "interes-compuesto": ICONS.growth };

  function mountToolsGrid() {
    if (!data.tools) return;
    var here = (location.pathname.split("/").pop() || "index.html");
    $$("[data-tools-grid]").forEach(function (grid) {
      if (grid.children.length) return;
      var others = data.tools.filter(function (t) { return t.href !== here; });
      grid.innerHTML = others.map(function (t) {
        var icon = TOOL_ICON_BY_ID[t.id] || ICONS.calc;
        // La hipoteca es la herramienta insignia (mayor valor publicitario);
        // le damos un poco más de protagonismo visual cuando aparece como
        // sugerencia en las otras dos calculadoras.
        var featured = t.id === "hipoteca" ? " tool-tile--featured" : "";
        return "<a class=\"tool-tile" + featured + "\" href=\"" + t.href + "\">" +
          "<span class=\"tool-tile__icon\">" + icon + "</span>" +
          "<span class=\"tool-tile__body\"><h3>" + escHTML(t.title) + "</h3><p>" + escHTML(t.desc) + "</p>" +
          "<span class=\"tool-tile__cta\">Empezar a calcular <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/><polyline points=\"12 5 19 12 12 19\"/></svg></span></span></a>";
      }).join("");
    });
  }

  // Selector rápido de herramientas — pastillas justo bajo el subtítulo del
  // hero, para que "acceso a las 3 calculadoras" se entienda en el primer
  // vistazo sin empujar la calculadora fuera del "above the fold".
  function mountToolSwitcher() {
    if (!data.tools) return;
    var here = (location.pathname.split("/").pop() || "index.html");
    $$("[data-tool-switcher]").forEach(function (nav) {
      if (nav.children.length) return;
      nav.innerHTML = data.tools.map(function (t) {
        var icon = TOOL_ICON_BY_ID[t.id] || ICONS.calc;
        var current = t.href === here ? " aria-current=\"page\"" : "";
        return "<a class=\"switcher-pill\" href=\"" + t.href + "\"" + current + ">" + icon + "<span>" + escHTML(t.title.replace("Calculadora de ", "")) + "</span></a>";
      }).join("");
    });
  }

  function mountFaq(selector, list) {
    var el = $(selector);
    if (!el || el.children.length || !list) return;
    el.innerHTML = list.map(function (f) {
      return "<details><summary>" + escHTML(f.q) + ICONS.chevron + "</summary><div class=\"faq-a\">" + escHTML(f.a) + "</div></details>";
    }).join("");
  }

  function mountYear() {
    $$("[data-year]").forEach(function (el) { el.textContent = String(data.year || new Date().getFullYear()); });
  }

  // ============================================================
  // REVEAL ON SCROLL
  // ============================================================
  function initReveals() {
    var els = $$(".reveal");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.05, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { io.observe(e); });
    setTimeout(function () { els.forEach(function (e) { e.classList.add("is-in"); }); }, 4000);
  }

  // ============================================================
  // VALIDACIÓN POR CAMPO (mensajes humanos, cerca del input)
  // ============================================================
  // rules: [{ id, min, max, msg }] — msg es el texto exacto a mostrar.
  function validateFields(rules) {
    var firstInvalidInput = null;
    var allValid = true;
    rules.forEach(function (rule) {
      var input = $("#" + rule.id);
      if (!input) return;
      var field = input.closest(".field");
      var errorEl = field ? $(".field-error", field) : null;
      var val = parseNum(input.value);
      var valid = isFinite(val) && val >= rule.min && val <= rule.max;
      if (field) field.classList.toggle("has-error", !valid);
      input.setAttribute("aria-invalid", valid ? "false" : "true");
      if (errorEl) errorEl.textContent = valid ? "" : rule.msg;
      if (!valid) {
        allValid = false;
        if (!firstInvalidInput) firstInvalidInput = input;
      }
    });
    if (!allValid && firstInvalidInput) {
      firstInvalidInput.focus({ preventScroll: false });
    }
    return allValid;
  }

  function clearFieldErrors(rules) {
    rules.forEach(function (rule) {
      var input = $("#" + rule.id);
      if (!input) return;
      var field = input.closest(".field");
      if (field) field.classList.remove("has-error");
      input.setAttribute("aria-invalid", "false");
    });
  }

  // Feedback táctil de "calculando" — el cálculo es instantáneo, pero un
  // pulso breve del botón confirma la pulsación (invariante 24: estados).
  function withLoadingState(btn, workFn) {
    if (!btn) { workFn(); return; }
    btn.classList.add("is-loading");
    btn.disabled = true;
    setTimeout(function () {
      safe(workFn, "withLoadingState:work");
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }, 150);
  }

  // ============================================================
  // CALCULADORA HIPOTECA
  // ============================================================
  function initHipoteca() {
    var form = $("#form-hipoteca");
    if (!form) return;
    var resultZone = $("#resultado-hipoteca");
    var errorMsg = $("#error-hipoteca");
    var submitBtn = $("button[type=submit]", form);
    var resetBtn = $("#reset-hipoteca");
    var compareBtn = $("#toggle-comparar");
    var comparePanel = $("#panel-comparar");

    var RULES = [
      { id: "precio-vivienda", min: 1, max: 50000000, msg: "Introduce un precio de vivienda válido (por ejemplo, 150.000)." },
      { id: "entrada-pct", min: 0, max: 100, msg: "La entrada debe estar entre 0 % y 100 %." },
      { id: "interes-hipoteca", min: 0, max: 20, msg: "Introduce un interés (TIN) entre 0 % y 20 %." },
      { id: "plazo-hipoteca", min: 1, max: 50, msg: "El plazo debe estar entre 1 y 50 años." }
    ];

    function ejecutarCalculo() {
      if (!validateFields(RULES)) {
        errorMsg.textContent = "Revisa los campos marcados en rojo antes de calcular.";
        errorMsg.classList.add("is-visible");
        resultZone.classList.remove("is-visible");
        return;
      }
      errorMsg.classList.remove("is-visible");

      var precio = parseNum($("#precio-vivienda").value);
      var entradaPct = parseNum($("#entrada-pct").value);
      var interes = parseNum($("#interes-hipoteca").value);
      var years = parseNum($("#plazo-hipoteca").value);

      var capital = precio * (1 - entradaPct / 100);
      var months = Math.round(years * 12);
      var r = frenchAmortization(capital, interes, months);

      $("#out-cuota").textContent = fmtEUR2.format(r.cuota);
      $("#out-capital").textContent = fmtEUR.format(capital);
      $("#out-total-pagado").textContent = fmtEUR.format(r.totalPagado);
      $("#out-total-interes").textContent = fmtEUR.format(r.totalInteres);
      $("#out-entrada").textContent = fmtEUR.format(precio - capital);
      var subtitleEl = $("#out-subtitle");
      if (subtitleEl) {
        subtitleEl.textContent = "Para una hipoteca de " + fmtEUR.format(capital) + " a " + years + " años al " + interes.toString().replace(".", ",") + "% TIN, pagarás esto cada mes.";
      }

      var yearsData = { principal: [], interest: [] };
      for (var y = 0; y < years; y++) {
        var idx = Math.min(r.schedule.length - 1, (y + 1) * 12 - 1);
        var acumCapital = 0, acumInteres = 0;
        for (var mm = 0; mm <= idx; mm++) { acumCapital += r.schedule[mm].capital; acumInteres += r.schedule[mm].interes; }
        yearsData.principal.push(acumCapital);
        yearsData.interest.push(acumInteres);
      }
      safe(function () {
        drawStackedChart($("#chart-hipoteca"),
          { data: yearsData.principal, color: "#0d8a5f" },
          { data: yearsData.interest, color: "#b1650f" },
          yearsData.principal.length);
      }, "chart-hipoteca");

      renderAmortTable($("#tabla-hipoteca"), r.schedule, "loan");
      resultZone.classList.add("is-visible");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      withLoadingState(submitBtn, ejecutarCalculo);
    });
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.classList.contains("has-error")) safe(function () { validateFields(RULES); }, "revalidate-hipoteca");
    });
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        form.reset();
        clearFieldErrors(RULES);
        errorMsg.classList.remove("is-visible");
        resultZone.classList.remove("is-visible");
        if (comparePanel) comparePanel.classList.remove("is-visible");
        var first = $("#precio-vivienda"); if (first) first.focus();
      });
    }
    safe(ejecutarCalculo, "hipoteca-inicial");

    if (compareBtn && comparePanel) {
      compareBtn.addEventListener("click", function () {
        var open = comparePanel.classList.toggle("is-visible");
        compareBtn.setAttribute("aria-expanded", String(open));
        $(".btn-label", compareBtn) && ($(".btn-label", compareBtn).textContent = open ? "Ocultar comparador" : "Comparar dos escenarios");
      });
      var formB = $("#form-hipoteca-b");
      if (formB) {
        var calcularB = function (e) {
          if (e) e.preventDefault();
          var precioB = parseNum($("#precio-vivienda-b").value);
          var entradaB = parseNum($("#entrada-pct-b").value);
          var interesB = parseNum($("#interes-hipoteca-b").value);
          var yearsB = parseNum($("#plazo-hipoteca-b").value);
          if (![precioB, entradaB, interesB, yearsB].every(function (v) { return isFinite(v) && v >= 0; }) || precioB <= 0 || yearsB <= 0) return;
          var capitalB = precioB * (1 - entradaB / 100);
          var rB = frenchAmortization(capitalB, interesB, Math.round(yearsB * 12));
          $("#out-cuota-b").textContent = fmtEUR2.format(rB.cuota);
          $("#out-total-interes-b").textContent = fmtEUR.format(rB.totalInteres);
          $("#out-total-pagado-b").textContent = fmtEUR.format(rB.totalPagado);
        };
        formB.addEventListener("submit", calcularB);
        safe(calcularB, "hipoteca-b-inicial");
      }
    }
  }

  // ============================================================
  // CALCULADORA PRÉSTAMO PERSONAL
  // ============================================================
  function initPrestamo() {
    var form = $("#form-prestamo");
    if (!form) return;
    var resultZone = $("#resultado-prestamo");
    var errorMsg = $("#error-prestamo");
    var submitBtn = $("button[type=submit]", form);
    var resetBtn = $("#reset-prestamo");

    var RULES = [
      { id: "importe-prestamo", min: 1, max: 1000000, msg: "Introduce un importe válido, mayor que 0 €." },
      { id: "interes-prestamo", min: 0, max: 30, msg: "Introduce un interés (TIN) entre 0 % y 30 %." },
      { id: "plazo-prestamo", min: 1, max: 480, msg: "El plazo debe estar entre 1 y 480 meses (40 años)." }
    ];

    function ejecutarCalculo() {
      if (!validateFields(RULES)) {
        errorMsg.textContent = "Revisa los campos marcados en rojo antes de calcular.";
        errorMsg.classList.add("is-visible");
        resultZone.classList.remove("is-visible");
        return;
      }
      errorMsg.classList.remove("is-visible");

      var importe = parseNum($("#importe-prestamo").value);
      var interes = parseNum($("#interes-prestamo").value);
      var meses = parseNum($("#plazo-prestamo").value);

      var r = frenchAmortization(importe, interes, meses);
      $("#out-cuota-prestamo").textContent = fmtEUR2.format(r.cuota);
      $("#out-total-pagado-prestamo").textContent = fmtEUR.format(r.totalPagado);
      $("#out-total-interes-prestamo").textContent = fmtEUR.format(r.totalInteres);
      var subtitleEl = $("#out-subtitle-prestamo");
      if (subtitleEl) {
        subtitleEl.textContent = "Para " + fmtEUR.format(importe) + " en " + meses + " meses al " + interes.toString().replace(".", ",") + "% TIN, pagarás esto cada mes.";
      }

      var years = Math.ceil(meses / 12);
      var yearsData = { principal: [], interest: [] };
      for (var y = 0; y < years; y++) {
        var idx = Math.min(r.schedule.length - 1, (y + 1) * 12 - 1);
        var acumCapital = 0, acumInteres = 0;
        for (var mm = 0; mm <= idx; mm++) { acumCapital += r.schedule[mm].capital; acumInteres += r.schedule[mm].interes; }
        yearsData.principal.push(acumCapital);
        yearsData.interest.push(acumInteres);
      }
      safe(function () {
        drawStackedChart($("#chart-prestamo"),
          { data: yearsData.principal, color: "#0d8a5f" },
          { data: yearsData.interest, color: "#b1650f" },
          yearsData.principal.length);
      }, "chart-prestamo");

      renderAmortTable($("#tabla-prestamo"), r.schedule, "loan");
      resultZone.classList.add("is-visible");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      withLoadingState(submitBtn, ejecutarCalculo);
    });
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.classList.contains("has-error")) safe(function () { validateFields(RULES); }, "revalidate-prestamo");
    });
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        form.reset();
        clearFieldErrors(RULES);
        errorMsg.classList.remove("is-visible");
        resultZone.classList.remove("is-visible");
        var first = $("#importe-prestamo"); if (first) first.focus();
      });
    }
    safe(ejecutarCalculo, "prestamo-inicial");
  }

  // ============================================================
  // CALCULADORA INTERÉS COMPUESTO
  // ============================================================
  function initInteres() {
    var form = $("#form-interes");
    if (!form) return;
    var resultZone = $("#resultado-interes");
    var errorMsg = $("#error-interes");
    var submitBtn = $("button[type=submit]", form);
    var resetBtn = $("#reset-interes");

    var RULES = [
      { id: "capital-inicial", min: 0, max: 50000000, msg: "El capital inicial no puede ser negativo." },
      { id: "aportacion-mensual", min: 0, max: 100000, msg: "La aportación mensual no puede ser negativa." },
      { id: "rentabilidad-anual", min: -50, max: 50, msg: "Introduce una rentabilidad entre -50 % y 50 %." },
      { id: "plazo-interes", min: 1, max: 80, msg: "El plazo debe estar entre 1 y 80 años." }
    ];

    function ejecutarCalculo() {
      if (!validateFields(RULES)) {
        errorMsg.textContent = "Revisa los campos marcados en rojo antes de calcular.";
        errorMsg.classList.add("is-visible");
        resultZone.classList.remove("is-visible");
        return;
      }
      errorMsg.classList.remove("is-visible");

      var inicial = parseNum($("#capital-inicial").value);
      var mensual = parseNum($("#aportacion-mensual").value);
      var rentabilidad = parseNum($("#rentabilidad-anual").value);
      var years = parseNum($("#plazo-interes").value);

      var months = Math.round(years * 12);
      var r = compoundGrowth(inicial, mensual, rentabilidad, months);

      $("#out-balance-final").textContent = fmtEUR.format(r.balanceFinal);
      $("#out-total-aportado").textContent = fmtEUR.format(r.totalAportado);
      $("#out-total-interes-compuesto").textContent = fmtEUR.format(r.totalInteres);
      var subtitleEl = $("#out-subtitle-interes");
      if (subtitleEl) {
        subtitleEl.textContent = "En " + years + " años, con " + fmtEUR.format(mensual) + "/mes al " + rentabilidad.toString().replace(".", ",") + "% anual, este sería tu saldo estimado.";
      }

      var yearsData = { aportado: [], interes: [] };
      for (var y = 0; y < years; y++) {
        var idx = Math.min(r.schedule.length - 1, (y + 1) * 12 - 1);
        yearsData.aportado.push(r.schedule[idx].aportado);
        yearsData.interes.push(r.schedule[idx].interes);
      }
      safe(function () {
        drawStackedChart($("#chart-interes"),
          { data: yearsData.aportado, color: "#0d8a5f" },
          { data: yearsData.interes, color: "#b1650f" },
          yearsData.aportado.length);
      }, "chart-interes");

      renderAmortTable($("#tabla-interes"), r.schedule, "growth");
      resultZone.classList.add("is-visible");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      withLoadingState(submitBtn, ejecutarCalculo);
    });
    form.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field && field.classList.contains("has-error")) safe(function () { validateFields(RULES); }, "revalidate-interes");
    });
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        form.reset();
        clearFieldErrors(RULES);
        errorMsg.classList.remove("is-visible");
        resultZone.classList.remove("is-visible");
        var first = $("#capital-inicial"); if (first) first.focus();
      });
    }
    safe(ejecutarCalculo, "interes-inicial");
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    document.documentElement.classList.remove("no-js");
    safe(mountNav, "mountNav");
    safe(mountToolSwitcher, "mountToolSwitcher");
    safe(mountToolsGrid, "mountToolsGrid");
    safe(function () { mountFaq("[data-faq-hipoteca]", data.faqsHipoteca); }, "mountFaqHipoteca");
    safe(function () { mountFaq("[data-faq-prestamo]", data.faqsPrestamo); }, "mountFaqPrestamo");
    safe(function () { mountFaq("[data-faq-interes]", data.faqsInteres); }, "mountFaqInteres");
    safe(mountYear, "mountYear");
    safe(initMobileMenu, "initMobileMenu");
    safe(initReveals, "initReveals");
    safe(initHipoteca, "initHipoteca");
    safe(initPrestamo, "initPrestamo");
    safe(initInteres, "initInteres");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
