// VERTEX

attribute vec2 position;
attribute vec2 texcoords;
attribute vec4 vertexColor;

uniform mat4 transform;
uniform vec4 lighting;

varying vec2 textureCoord;
varying vec4 vColor;

void main() {
	textureCoord = texcoords;
	vColor = vertexColor * lighting;
	gl_Position = transform * vec4(position, 0, 1);
}

// FRAGMENT

precision mediump float;

varying vec2 textureCoord;
varying vec4 vColor;

void main() {
	float d = clamp((1.0 - length(textureCoord)) + 0.1, 0.0, 1.0);
	float m = d * d * d;
	gl_FragColor = vec4(m, m, m, 1) * vColor;
}
