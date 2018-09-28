zoom_x = 0;
zoom_y = 0;
draw_interference = false;
draw_average = false;
draw_difference = false;

lambda1 = 0;
lambda2 = 0;

ctx = null;
fctx = null;
audio_ctx = null;

off_x = 0;

step = 5;

resize = function () {
    ctx.canvas.width = window.innerWidth - 10;
    ctx.canvas.height = window.innerHeight - 300;
    draw_graph();
}

window.onload = function () {
    ctx = document.getElementById("graph_canvas").getContext("2d");
    fctx = document.getElementById("f_canvas").getContext("2d");

    resize();

    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    audio_ctx = new AudioContext();

    update_values();
    update_settings();
}

window.onresize = function () { resize() };

window.onkeydown = function (e) {
    changed = false;
    switch (e.keyCode) {
        case 37:
            off_x -= zoom_x;
            changed = true;
            break;
        case 39:
            off_x += zoom_x;
            changed = true;
            break;
        case 38:
            zoom_x++;
            changed = true;
            break;
        case 40:
            zoom_x--;
            changed = true;
            break;
        case 65:
            zoom_y++;
            changed = true;
            break;
        case 90:
            zoom_y--;
            changed = true;
            break;
    }

    if (changed) {
        draw_graph();
        document.getElementById("zoomx").value = zoom_x;
        document.getElementById("zoomy").value = zoom_y;
    }
}


update_values = function () {
    lambda1 = parseFloat(document.getElementById("frequency1").value);
    lambda2 = parseFloat(document.getElementById("frequency2").value);

    document.getElementById("fb").innerHTML = "Frequenza battiti: " + Math.abs(lambda1 - lambda2);
    document.getElementById("fa").innerHTML = "Frequenza media: " + (lambda1 + lambda2) / 2;

    draw_graph();
}

update_settings = function () {
    zoom_x = parseFloat(document.getElementById("zoomx").value);
    zoom_y = parseFloat(document.getElementById("zoomy").value);
    draw_interference = document.getElementById("inter").checked;
    draw_average = document.getElementById("aver").checked;
    draw_difference = document.getElementById("diff").checked;
    step = parseInt(document.getElementById("q").value);

    draw_graph();
}

get_wave_sin = function (x, lambda, scale_x) {
    return Math.sin((x + off_x) * scale_x * lambda);
}

get_wave_cos = function (x, lambda, scale_x) {
    return Math.cos((x + off_x) * scale_x * lambda);
}

draw_wave = function (color, amp, lambda, relative_y, wave_fn) {
    var scale_x = 2 * Math.PI / (ctx.canvas.width * zoom_x);
    var scale_y = zoom_y;

    var off_y = ctx.canvas.height / 2 + relative_y;

    ctx.strokeStyle = color;
    ctx.beginPath();

    for (var x = 0; x < ctx.canvas.width; x += step) {
        var y1 = scale_y * amp * wave_fn(x, lambda, scale_x) + off_y;
        var y2 = scale_y * amp * wave_fn(x + step, lambda, scale_x) + off_y;
        ctx.moveTo(x, y1);
        ctx.lineTo(x + step, y2);
    }
    ctx.stroke();
}

draw_sum = function (color, lambda1, lambda2, relative_y) {
    var scale_x = 2 * Math.PI / (ctx.canvas.width * zoom_x);
    var scale_y = zoom_y;

    var off_y = ctx.canvas.height / 2 + relative_y;

    ctx.strokeStyle = color;
    ctx.beginPath();

    for (var x = 0; x < ctx.canvas.width; x += step) {
        var y_start1 = -get_wave_sin(x, (lambda1 + lambda2) / 2, scale_x);
        var y_start2 = -get_wave_cos(x, (lambda1 - lambda2) / 2, scale_x);

        var y_end1 = -get_wave_sin(x + step, (lambda1 + lambda2) / 2, scale_x);
        var y_end2 = -get_wave_cos(x + step, (lambda1 - lambda2) / 2, scale_x);

        ctx.moveTo(x, 2 * y_start1 * y_start2 * scale_y + off_y);
        ctx.lineTo(x + step, 2 * y_end1 * y_end2 * scale_y + off_y);
    }
    ctx.stroke();
}

draw_graph = function () {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    draw_wave("#FF0000", 1, lambda1, -zoom_y * 3, get_wave_sin);
    draw_wave("#00FF00", 1, lambda2, -zoom_y * 3, get_wave_sin);
    if (draw_average) {
        draw_wave("#000000", 1, (lambda1 + lambda2) / 2, zoom_y * 3, get_wave_sin);
    }
    if (draw_difference) {
        draw_wave("#F000F0", 2, (lambda1 - lambda2) / 2, zoom_y * 3, get_wave_cos);
    }
    if (draw_interference) {
        draw_sum("#0000FF", lambda1, lambda2, zoom_y * 3);
    }

    fctx.clearRect(0, 0, fctx.canvas.width, fctx.canvas.height);
    draw_fa();
}

draw_fa = function () {
    // Display from 0 to 880 Hz on the canvas
    var scale = fctx.canvas.width / 880;
    var y = fctx.canvas.height;

    fctx.fillStyle = "#FF0000";
    fctx.strokeStyle = "#FF0000";
    fctx.beginPath();

    fctx.moveTo(lambda1 * scale, 0);
    fctx.lineTo(lambda1 * scale, y);
    fctx.fillText(lambda1, lambda1 * scale, 2 * y / 3);

    fctx.stroke();

    fctx.fillStyle = "#00FF00";
    fctx.strokeStyle = "#00FF00";
    fctx.beginPath();

    fctx.moveTo(lambda2 * scale, 0);
    fctx.lineTo(lambda2 * scale, y);
    fctx.fillText(lambda2, lambda2 * scale, y / 3);

    fctx.stroke();
}

play_wave = function (lambda) {
    var seconds = 2;
    var length = audio_ctx.sampleRate * seconds;
    var buf = new Float32Array(length);

    for (var x = 0; x < length; x++) {
        var wave = Math.sin(x * Math.PI * 2 * lambda / audio_ctx.sampleRate);
        buf[x] = wave;
    }

    var buffer = audio_ctx.createBuffer(1, buf.length, audio_ctx.sampleRate);
    buffer.copyToChannel(buf, 0);
    var source = audio_ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(audio_ctx.destination);
    source.start(0);
}

play_sum_wave = function () {
    var seconds = 3;
    var length = audio_ctx.sampleRate * seconds;
    var buf = new Float32Array(length);

    for (var x = 0; x < length; x++) {
        var wave1 = Math.sin(x * Math.PI * 2 * ((lambda1 + lambda2) / 2) / audio_ctx.sampleRate);
        var wave2 = Math.cos(x * Math.PI * 2 * ((lambda1 - lambda2) / 2) / audio_ctx.sampleRate);
        var total = wave1 * wave2;
        buf[x] = total;
    }

    var buffer = audio_ctx.createBuffer(1, buf.length, audio_ctx.sampleRate);
    buffer.copyToChannel(buf, 0);
    var source = audio_ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(audio_ctx.destination);
    source.start(0);
}