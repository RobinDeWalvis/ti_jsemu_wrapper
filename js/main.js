/*
    This file is part of 'ti_jsemu_wrapper' - see https://github.com/TI-Planet/ti_jsemu_wrapper
    LGPL3-licensed
*/

var destCanvas;
var destCanvasCtx;
var srcCanvas;
var histoList;
var calculatorDiv;
var hand;
var displayDiv;
var zoomDiv;
var calcDivZoom = 1.0;
var zoomedScreenRatio = 1.5;
var histoListMaxEls = 8;
var hasHand = false;
var hasZoomedDisplay = true;
var keyHistoryArray = [];

$id = function(id) { return document.getElementById(id); };
$sel = function(sel) { return document.querySelector(sel); };
$selAll = function(sel) { return document.querySelectorAll(sel); };

function initWithSVG(svgStr) {
    init_wrapper();
    svgVar = svgStr;
    clog_bak = console.log;
    theCalc = new TI84ForSmartView();
    console.log = clog_bak;
    if (!theCalc) {
        return alert("Error initializing the emulator :(")
    }
    theCalc.initSVG();
    resizeHelper();
    $id("svg").style.background = $sel("#Background_Color rect").getAttribute("fill") || "#000";
    theCalc.boot();
    refreshCanvas();
    bindEvents();
    $id("leftToolbar").style.visibility = $id("rightToolbar").style.visibility = "visible";
}

function init_wrapper() {
    displayDiv = $id("displayDiv");
    zoomDiv = $id("zoom");
    srcCanvas = $id("display");
    destCanvas = $id("zoomeddisplay");
    destCanvasCtx = destCanvas.getContext('2d');
    destCanvasCtx.scale(zoomedScreenRatio, zoomedScreenRatio);
    histoList = $id("list");
    calculatorDiv = $id("calculatorDiv");
    hand = $id("hand");
    var isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
    $id('start').disabled = !isChrome;
    $id('start').title = isChrome ? 'Will create a webm video' : 'Feature only available on Chrome (needs WebP)!';
}

function bindEvents() {
    [].forEach.call($selAll("#svg g[id^='KEY']"), function(key) {
        key.addEventListener("click", function () {
            var emu_hist = theCalc.getKeyHistory();
            if (emu_hist.length && keyHistoryArray != emu_hist) {
                keyHistoryArray = emu_hist.slice();
                addKeyToHistory(keyHistoryArray[keyHistoryArray.length - 1]);
            }
        }, false);
    });

    document.addEventListener('keydown', function(e) {
        if (e.keyCode == 27) { // escape key
            if ($sel("#svg g[id^='KEY'] path[fill='red']")) {
                theCalc.clearHighlightedKey();
            } else {
                clearHisto();
            }
        }
    });

    zoomDiv.onmouseenter = calculatorDiv.onmouseenter = function() { hasHand && (hand.style.visibility = "visible"); };
    zoomDiv.onmouseleave = calculatorDiv.onmouseleave = function() { hasHand && (hand.style.visibility = "hidden"); };
    zoomDiv.onmousemove = calculatorDiv.onmousemove = function(e) { hasHand && moveHand((e || event).clientX, (e || event).clientY); };

    $id("resetEmu").onclick = function() { theCalc.resetSVEmulator(); clearHisto(); };
    $id("clearKey").onclick = function() { theCalc.clearHighlightedKey(); };
    $id("screenshot").onclick = function() { downloadScreenshot('display', 'screenshot_calc.png'); };
    $id("toggleHisto").onclick = function() { clearHisto(); toggleDisplay('histo'); };
    $id("toggleZoom").onclick = function() {
        toggleDisplay('zoom');
        toggleDisplay('zoomValueLabel');
        hasZoomedDisplay = !hasZoomedDisplay;
    };
    $id("zoomValue").oninput = $id("zoomValue").onchange = function() {
        zoomedScreenRatio = parseFloat(this.value);
        destCanvas.width = srcCanvas.width*zoomedScreenRatio;
        destCanvas.height = srcCanvas.height*zoomedScreenRatio;
        $sel("#zoomValueLabel span").innerHTML = zoomedScreenRatio.toFixed(1) + 'x';
        destCanvasCtx.setTransform(1, 0, 0, 1, 0, 0);
        destCanvasCtx.clearRect(0,0,destCanvasCtx.canvas.width,destCanvasCtx.canvas.height);
        destCanvasCtx.scale(zoomedScreenRatio, zoomedScreenRatio);
    };
    $id("toggleHand").onclick = function() {
        hasHand = !hasHand;
        [].forEach.call($selAll('#display, #calcTop, #zoom, #svg'), function(el) {
            el.style.cursor = hasHand ? "none" : "default";
        });
    };

    window.onresize = resizeHelper;
}

function refreshCanvas() {
    if (hasZoomedDisplay) {
        destCanvasCtx.drawImage(srcCanvas, 0, 0);
    }
    setTimeout(refreshCanvas, 100);
}

function downloadScreenshot(canvas, filename) {
    var lnk = document.createElement('a');
    lnk.download = filename;
    lnk.target = "_blank"; // at least it doesn't replace the current page in Safari...
    lnk.href = $id(canvas).toDataURL();
    if (document.createEvent) {
        var e = document.createEvent("MouseEvents");
        e.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        lnk.dispatchEvent(e);
    } else if (lnk.fireEvent) {
        lnk.fireEvent("onclick");
    }
}

function moveHand(x, y) {
    x /= calcDivZoom;
    y /= calcDivZoom;
    if (calculatorDiv) {
        var rect = calculatorDiv.getBoundingClientRect();
        x = x - rect.left;
        y = y - rect.top;
    }
    x = x - 20;
    y = y - 5;
    if (hand) {
        hand.style.left = x + "px";
        hand.style.top = y + "px";
    }
}

function clearHisto() {
    keyHistoryArray = [];
    histoList.innerHTML = "";
}

function addKeyToHistory(name) {
    var li = document.createElement("li");
    var oImg = document.createElement("img");
    oImg.setAttribute('src', buttonImages[name] );
    oImg.style.width = oImg.style.height = "72px";
    li.appendChild(oImg);
    if (histoList.childNodes.length) {
        histoList.insertBefore(li, histoList.firstChild);
    } else {
        histoList.appendChild(li);
    }
    if (histoList.childNodes.length > histoListMaxEls) {
        histoList.removeChild(histoList.lastChild);
    }
}

function toggleDisplay(id) {
    var e = $id(id);
    e.style.display = e.style.display != 'none' ? 'none' : 'inline-block';
}

function resizeHelper() {
    theCalc.Zoom();
    var val = calculatorDiv.style.zoom;
    val *= 0.8;
    if (val < 1)
        val = 1;
    calculatorDiv.style.zoom = val;
    calculatorDiv.style.MozTransform = "scale(" + val + ")";
    calcDivZoom = val;
}

function runAsm(orig, code, onDone)
{
	state = [];
	state.registers = theCalc.M.Xd();
	state.instr_dd00 = theCalc.M.Fg[0];
	state.data = [];
	
	for (var i=0; i<code.length; i++)
	{
		state.data[i] = theCalc.k.memory.v[orig+i];
		theCalc.k.memory.v[orig+i] = code[i];
	}
	
	theCalc.M.Fg[0] = function()
	{
		for (var i=0; i<state.data.length; i++)
			theCalc.k.memory.v[orig+i] = state.data[i];
		
		theCalc.M.Fg[0] = state.instr_dd00;
		theCalc.M.reset(state.registers);
		if (onDone)
			onDone();
	};
	theCalc.M.a = orig;
}

function loadProgram(file)
{
	if (file.slice(0, 8) != "**TI83F*")
		return alert("Error: Invalid file!");
	var size = file.charCodeAt(54) << 8 | file.charCodeAt(53);
	var data = file.slice(55, 55+size);
	if (!(data.charCodeAt(0) == 11 || data.charCodeAt(0) == 13) || data.charCodeAt(1) != 0)
		return alert("Error: Corrupted data!");
	
	var length = data.charCodeAt(3) << 8 | data.charCodeAt(2);
	var type = data.charCodeAt(4);
	var name = data.slice(5,13);
	var flag = data.charCodeAt(14);
	
	if (data.charCodeAt(0) == 13 && flag != 0)
		return alert("Error: Archived variables are not supported.");
	
	var OP1 = 0xD005F8;
	theCalc.k.memory.v[OP1] = type;
	for (var i=0; i<name.length; i++)
		theCalc.k.memory.v[OP1+i+1] = name.charCodeAt(i);
	
	code = [
		0xF3, // di
		0xCD, 0x0C, 0x05, 0x02, // call $2050C (_ChkFindSym)
		0x38, 0x04, // jr c, noDel
		0xCD, 0x88, 0x05, 0x02, // call $20588 (_DelVar)
		0x3E, type, // noDel: ld a, type
		0x21, length & 0xFF, length >> 8 & 0xFF, length >> 16 & 0xFF, // ld hl, length
		0xCD, 0x38, 0x13, 0x02, // call 0x021338 (_CreateVar)
		0xED, 0x53, 0x00, 0x00, 0xD4, // ld (0xD40000), de
		0xFB, // ei
		0xDD, 0x00
	]
	
	runAsm(0xD40003, code, function()
	{
		var varLoc = theCalc.k.memory.v[0xD40000] | (theCalc.k.memory.v[0xD40001] << 8) | (theCalc.k.memory.v[0xD40002] << 16);
		console.log(varLoc);
		for (var i=0; i<length; i++)
			theCalc.k.memory.v[varLoc+i] = data.charCodeAt(17+i) & 0xFF;
	});
}