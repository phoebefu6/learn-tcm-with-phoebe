/* tcm-live.js - the five-phases wheel for learn-tcm-with-phoebe
   An interactive map of the Neijing's wuxing correspondence system.
   Drop <div class="tcmbox"></div> on a page and this builds the whole tool.

   Honesty note baked into the UI: this visualizes the text's classification
   MODEL (Han-dynasty correlative cosmology) - it asserts no physiology.

   The five colors on the wheel are themselves part of the correspondence
   set (the wuse: qing/red/yellow/white/black), so they intentionally sit
   outside the site palette - they are content, not decoration. */

(function () {
  "use strict";

  var PHASES = [
    { key: "wood",  hanzi: "木", pinyin: "mù",   en: "Wood",
      color: "#4A7C59", text: "#FFFFFF",
      zang: "肝 gān · liver", fu: "胆 dǎn · gallbladder",
      season: "春 · spring", emotion: "怒 nù · anger",
      taste: "酸 suān · sour", wcolor: "青 qīng · green-blue",
      direction: "东 · east" },
    { key: "fire",  hanzi: "火", pinyin: "huǒ",  en: "Fire",
      color: "#C23B2A", text: "#FFFFFF",
      zang: "心 xīn · heart", fu: "小肠 · small intestine",
      season: "夏 · summer", emotion: "喜 xǐ · joy",
      taste: "苦 kǔ · bitter", wcolor: "赤 chì · red",
      direction: "南 · south" },
    { key: "earth", hanzi: "土", pinyin: "tǔ",   en: "Earth",
      color: "#C9A227", text: "#3A2C00",
      zang: "脾 pí · spleen", fu: "胃 wèi · stomach",
      season: "长夏 · late summer", emotion: "思 sī · pensiveness",
      taste: "甘 gān · sweet", wcolor: "黄 huáng · yellow",
      direction: "中 · center" },
    { key: "metal", hanzi: "金", pinyin: "jīn",  en: "Metal",
      color: "#B9C2C9", text: "#23292E",
      zang: "肺 fèi · lung", fu: "大肠 · large intestine",
      season: "秋 · autumn", emotion: "悲 bēi · grief",
      taste: "辛 xīn · acrid", wcolor: "白 bái · white",
      direction: "西 · west" },
    { key: "water", hanzi: "水", pinyin: "shuǐ", en: "Water",
      color: "#2B3A4E", text: "#FFFFFF",
      zang: "肾 shèn · kidney", fu: "膀胱 · bladder",
      season: "冬 · winter", emotion: "恐 kǒng · fear",
      taste: "咸 xián · salty", wcolor: "黑 hēi · black",
      direction: "北 · north" }
  ];

  /* pentagon positions: fire top, clockwise fire->earth->metal->water->wood.
     generating cycle (sheng) = neighbours clockwise: wood->fire->earth->metal->water->wood.
     controlling cycle (ke) = the inner pentagram: wood->earth->water->fire->metal->wood. */
  var ORDER = ["fire", "earth", "metal", "water", "wood"]; /* clockwise from top */
  var SHENG = [["wood","fire"],["fire","earth"],["earth","metal"],["metal","water"],["water","wood"]];
  var KE    = [["wood","earth"],["earth","water"],["water","fire"],["fire","metal"],["metal","wood"]];

  var ROWS = [
    ["zang",      "Zang organ 脏"],
    ["fu",        "Fu organ 腑"],
    ["season",    "Season"],
    ["emotion",   "Emotion"],
    ["taste",     "Taste"],
    ["wcolor",    "Color 五色"],
    ["direction", "Direction"]
  ];

  function phase(key) { return PHASES.filter(function (p) { return p.key === key; })[0]; }

  document.querySelectorAll(".tcmbox").forEach(function (box) {
    box.innerHTML =
      '<div class="tcm-head">' +
        '<span class="tcm-title">The five-phases wheel 五行</span>' +
        '<span class="tcm-honest">a map of the text’s model - not a verified physiology</span>' +
      '</div>' +
      '<div class="tcm-controls">' +
        '<button type="button" class="tcm-pill tcm-sheng">相生 generating cycle</button>' +
        '<button type="button" class="tcm-pill tcm-ke">相克 controlling cycle</button>' +
      '</div>' +
      '<div class="tcm-stage"></div>' +
      '<p class="tcm-note">Click a phase to see its correspondences. Toggle a cycle to watch its arrows.</p>' +
      '<div class="tcm-detail"></div>';

    var stage = box.querySelector(".tcm-stage");
    var detail = box.querySelector(".tcm-detail");
    var noteEl = box.querySelector(".tcm-note");
    var shengBtn = box.querySelector(".tcm-sheng");
    var keBtn = box.querySelector(".tcm-ke");

    /* geometry */
    var W = 460, H = 420, cx = W / 2, cy = H / 2 + 4, R = 150, NODE = 44;
    function pos(key) {
      var i = ORDER.indexOf(key);
      var ang = -Math.PI / 2 + i * (2 * Math.PI / 5); /* fire at top, clockwise */
      return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
    }

    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("class", "tcm-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Interactive five phases wheel with generating and controlling cycles");
    stage.appendChild(svg);

    /* arrow marker defs (one per cycle color) */
    var defs = document.createElementNS(svgNS, "defs");
    defs.innerHTML =
      '<marker id="tcmShengAh" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">' +
        '<path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#4A7C59" stroke-width="1.8"/></marker>' +
      '<marker id="tcmKeAh" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">' +
        '<path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#C23B2A" stroke-width="1.8"/></marker>';
    svg.appendChild(defs);

    function edgeLine(a, b, cls, marker, curve) {
      var p1 = pos(a), p2 = pos(b);
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var ux = dx / len, uy = dy / len;
      var pad = NODE + 8;
      var x1 = p1.x + ux * pad, y1 = p1.y + uy * pad;
      var x2 = p2.x - ux * pad, y2 = p2.y - uy * pad;
      var el = document.createElementNS(svgNS, "path");
      if (curve) {
        /* bow generating arrows slightly outward from center */
        var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        var ox = mx - cx, oy = my - cy;
        var ol = Math.sqrt(ox * ox + oy * oy) || 1;
        var bx = mx + (ox / ol) * 26, by = my + (oy / ol) * 26;
        el.setAttribute("d", "M " + x1 + " " + y1 + " Q " + bx + " " + by + " " + x2 + " " + y2);
      } else {
        el.setAttribute("d", "M " + x1 + " " + y1 + " L " + x2 + " " + y2);
      }
      el.setAttribute("class", cls);
      el.setAttribute("fill", "none");
      el.setAttribute("marker-end", "url(#" + marker + ")");
      return el;
    }

    var shengGroup = document.createElementNS(svgNS, "g");
    SHENG.forEach(function (e) { shengGroup.appendChild(edgeLine(e[0], e[1], "tcm-edge tcm-edge-sheng", "tcmShengAh", true)); });
    shengGroup.setAttribute("class", "tcm-cycle tcm-cycle-sheng");
    svg.appendChild(shengGroup);

    var keGroup = document.createElementNS(svgNS, "g");
    KE.forEach(function (e) { keGroup.appendChild(edgeLine(e[0], e[1], "tcm-edge tcm-edge-ke", "tcmKeAh", false)); });
    keGroup.setAttribute("class", "tcm-cycle tcm-cycle-ke");
    svg.appendChild(keGroup);

    /* nodes */
    var selected = null;
    PHASES.forEach(function (p) {
      var g = document.createElementNS(svgNS, "g");
      g.setAttribute("class", "tcm-node");
      g.setAttribute("data-key", p.key);
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", p.en + " phase correspondences");
      var c = pos(p.key);
      var circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", c.x); circle.setAttribute("cy", c.y); circle.setAttribute("r", NODE);
      circle.setAttribute("fill", p.color);
      g.appendChild(circle);
      var t1 = document.createElementNS(svgNS, "text");
      t1.setAttribute("x", c.x); t1.setAttribute("y", c.y + 2);
      t1.setAttribute("class", "tcm-hanzi"); t1.setAttribute("fill", p.text);
      t1.setAttribute("text-anchor", "middle");
      t1.textContent = p.hanzi;
      g.appendChild(t1);
      var t2 = document.createElementNS(svgNS, "text");
      t2.setAttribute("x", c.x); t2.setAttribute("y", c.y + 24);
      t2.setAttribute("class", "tcm-en"); t2.setAttribute("fill", p.text);
      t2.setAttribute("text-anchor", "middle");
      t2.textContent = p.en;
      g.appendChild(t2);
      function select() {
        selected = p.key;
        svg.querySelectorAll(".tcm-node").forEach(function (n) { n.classList.toggle("on", n.getAttribute("data-key") === p.key); });
        renderDetail(p);
      }
      g.addEventListener("click", select);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } });
      svg.appendChild(g);
    });

    function renderDetail(p) {
      var rows = ROWS.map(function (r) {
        return '<div class="tcm-row"><span class="tcm-k">' + r[1] + '</span><span class="tcm-v">' + p[r[0]] + '</span></div>';
      }).join("");
      detail.innerHTML =
        '<div class="tcm-card" style="border-top-color:' + p.color + '">' +
          '<div class="tcm-card-head"><span class="tcm-card-hanzi" style="color:' + (p.key === "metal" ? "#6B7680" : p.color) + '">' + p.hanzi + '</span>' +
          '<span class="tcm-card-name">' + p.en + ' · ' + p.pinyin + '</span></div>' + rows +
        '</div>';
    }

    /* cycle toggles */
    var showSheng = false, showKe = false;
    function sync() {
      shengGroup.classList.toggle("show", showSheng);
      keGroup.classList.toggle("show", showKe);
      shengBtn.classList.toggle("on", showSheng);
      keBtn.classList.toggle("on", showKe);
      if (showSheng && showKe) noteEl.textContent = "相生 circle + 相克 star together: every phase feeds one neighbour and checks another - the model’s idea of balance.";
      else if (showSheng) noteEl.textContent = "相生 sheng - each phase generates the next around the circle: wood feeds fire, fire makes earth (ash), earth bears metal, metal enriches water, water feeds wood.";
      else if (showKe) noteEl.textContent = "相克 ke - the star of restraint: wood breaks earth, earth dams water, water quenches fire, fire melts metal, metal cuts wood.";
      else noteEl.textContent = "Click a phase to see its correspondences. Toggle a cycle to watch its arrows.";
    }
    shengBtn.addEventListener("click", function () { showSheng = !showSheng; sync(); });
    keBtn.addEventListener("click", function () { showKe = !showKe; sync(); });
    sync();

    /* start with fire selected so the panel is never empty */
    renderDetail(phase("fire"));
    svg.querySelector('[data-key="fire"]').classList.add("on");
    selected = "fire";
  });
})();
