/*======= canvas setup =======*/
const canvas = document.querySelector("canvas")
const textarea = document.querySelector("textarea")
const gl = canvas.getContext("webgl2")
const dpr = window.devicePixelRatio || 1
let animation_id = null

const vertex_source = `#version 300 es
in vec2 position;
uniform float v_time;
uniform vec4 v_mouse;
uniform vec2 v_resolution;

out vec2 coord;
out vec4 mouse;
out float time;
out vec2 resolution;

void main(void) {
    gl_Position = vec4(position, 0., 1.);
    coord = position;
    time = v_time;
    mouse = v_mouse;
    resolution = v_resolution;
}`

let x_prev = 0, y_prev = 0, dx = 0, dy = 0
let mouse_is_down = false

window.addEventListener("pointerdown", (e) => {
    // 🍣
    mouse_is_down = true
    x_prev = e.clientX
    y_prev = e.clientY
})

window.addEventListener("pointerleave", (e) => {
    mouse_is_down = false
})

window.addEventListener("pointercancel", (e) => {
    mouse_is_down = false
})
window.addEventListener("pointerup", (e) => {
    mouse_is_down = false
})

window.addEventListener("pointermove", (e) => {
    if (!mouse_is_down) return
    dx = e.clientX - x_prev
    dy = e.clientY - y_prev
    x_prev = e.clientX
    y_prev = e.clientY
})

function resize() {
    canvas.width = window.innerWidth * dpr * .65
    canvas.height = window.innerHeight * dpr * .75
    gl.viewport(0, 0, canvas.width, canvas.height)

    canvas.style.width = `${Math.floor(window.innerWidth * .65 - .5)}px`
    canvas.style.height = `${Math.floor(window.innerHeight * .75 - .5)}px`
    init_canvas()
}

window.onresize = resize
resize()

function compile_shader(source, type) {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error("ERROR IN SHADER: " + gl.getShaderInfoLog(shader))
    }
    return shader
}

function init_canvas() {
    const fragment_source = textarea.value

    const vertex_shader = compile_shader(vertex_source, gl.VERTEX_SHADER)
    const fragment_shader = compile_shader(fragment_source, gl.FRAGMENT_SHADER)
    const shader_program = gl.createProgram()
    gl.attachShader(shader_program, vertex_shader)
    gl.attachShader(shader_program, fragment_shader)
    gl.linkProgram(shader_program)

    /*===Attributes==============*/

    const _v_time = gl.getUniformLocation(shader_program, "v_time")
    const _v_mouse = gl.getUniformLocation(shader_program, "v_mouse")
    const _v_resolution = gl.getUniformLocation(shader_program, "v_resolution")

    const _position = gl.getAttribLocation(shader_program, "position")
    gl.enableVertexAttribArray(_position)

    /*===========================*/

    if (animation_id != null) {
        window.cancelAnimationFrame(animation_id)
    }
    gl.useProgram(shader_program)

    const rectangle_vertices = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, rectangle_vertices)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        1, 1,
        -1, 1
    ]), gl.STATIC_DRAW)

    const rectangle_faces = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rectangle_faces)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
        0, 1, 2,
        2, 3, 0
    ]), gl.STATIC_DRAW)

    gl.vertexAttribPointer(_position, 2, gl.FLOAT, false, 4 * 2, 0)

    /*===Draw====================*/
    gl.clearColor(0.0, 0.0, 0.0, 0.0)

    function render(timestamp) {
        // canvas' offset coords from the top left of the screen
        let { x, y } = canvas.getBoundingClientRect()

        gl.uniform1f(_v_time, timestamp * .001)
        gl.uniform4f(_v_mouse,
            dpr * x_prev - x,
            dpr * y_prev - y,
            dpr * dx,
            dpr * dy)
        gl.uniform2f(_v_resolution, canvas.width, canvas.height)

        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, rectangle_faces)
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
        gl.flush()
        animation_id = window.requestAnimationFrame(render)
    }

    render()
}

textarea.oninput = init_canvas

/*======= background controls =======*/

const f_shader_names = ["rainbow circles",
    "rainbow circles (var.)",
    "crosshairs (clickable)",
    "moving circles"]

const f_shaders = [`#version 300 es
precision mediump float;

in vec2 coord;
in float time;
in vec4 mouse;
in vec2 resolution;

out vec4 color;
void main(void) {
	float ar = resolution.x/resolution.y;
	float rows = 35.;
	vec2 sc = (vec2(coord.x, coord.y) + 1.)/2.;
	sc.x *= ar;
	vec2 grid = fract(sc * rows);
	vec2 cell = trunc(sc * rows);
	cell.x /= ar;
	cell /= rows;

	float d = (distance(vec2(.5), grid));
	float r = fract(((time*.09)-abs(cell.x-.5)-cell.y)/.4);
	vec3 c = vec3(1.);
	if (d > r - .05 && d < r + .05) {
		c *= vec3(1.);
	} else {
		c *= vec3(0.);
	}

	c[0] *= ((1. - cell.x) + (1. - cell.y))/2.;
	c[1] *= cell.x;
	c[2] *= cell.y;

	color = vec4(c, 1.);
}`, `#version 300 es
precision mediump float;

in vec2 coord;
in float time;
in vec4 mouse;
in vec2 resolution;

out vec4 color;
void main(void) {
	float ar = resolution.x/resolution.y;
	float rows = 359.;
	vec2 sc = (vec2(coord.x, coord.y) + 1.)/2.;
	sc.x *= ar;
	vec2 grid = fract(sc * rows);
	vec2 cell = trunc(sc * rows);
	cell.x /= ar;
	cell /= rows;

	float d = (distance(vec2(.5), grid));
	float r = fract(((time*.01)-abs(cell.x-.5)-cell.y)/.4);
	vec3 c = vec3(1.);
	if (d > r - .05 && d < r + .05) {
		c *= vec3(1.);
	} else {
		c *= vec3(0.);
	}

	c[0] *= ((1. - cell.x) + (1. - cell.y))/2.;
	c[1] *= cell.x;
	c[2] *= cell.y;

	color = vec4(c, 1.);
}`, `#version 300 es
precision mediump float;

in vec2 coord;
in float time;
in vec4 mouse;
in vec2 resolution;

out vec4 color;

vec2 rotate(vec2 uv, vec2 center, float angle) {
    vec2 temp = uv - center;
    
    float s = sin(angle);
    float c = cos(angle);
    mat2 m = mat2(c, -s, s, c);
    temp = m * temp;

    return temp + center;
}

void main(void) {
    float u = (mouse[0]/resolution[0] -.5) * 2.;
    float v = -(mouse[1]/resolution[1] - .5) * 2.;
    vec2 sc = vec2((coord[0]-u)*resolution[0]/resolution[1], coord[1]-v);

    vec2 uv_r = rotate(sc, vec2(0.), fract(time/8.)*3.14);
    color = vec4(abs(vec2(.02)/uv_r), 0, 1.0);
}`, `#version 300 es
precision mediump float;

in vec2 coord;
in float time;
in vec4 mouse;
in vec2 resolution;

out vec4 color;
void main(void) {
	float ar = resolution[0]/resolution[1];
	vec2 sc = vec2(coord[0] *ar, coord[1]);
	vec2 grid = fract(sc * 10.);
	float dist = distance(grid, vec2(0.5));
	float r = step(abs(cos(time + (coord[0] + coord[1])*3.14) * .67), dist);
	vec3 c = vec3(.8433, .80, .71);
	color = vec4(c*vec3(r), 1.0);
}`]

let current_shader = 0
function change_shader(idx) {
    const f_shader = f_shaders[idx]
    textarea.value = f_shader
    init_canvas()
}

document.getElementById("next-shader").onclick = (e) => {
    current_shader = (current_shader + 1) % f_shaders.length
    change_shader(current_shader)
}
document.getElementById("prev-shader").onclick = (e) => {
    current_shader = current_shader == 0 ? f_shaders.length - 1 : current_shader - 1
    change_shader(current_shader)
}