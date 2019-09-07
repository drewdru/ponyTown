// VERTEX

attribute vec3 position;
attribute vec2 texcoords;
attribute vec4 vertexColor;

uniform mat4 transform;

varying vec2 textureCoord;
varying vec4 vColor;

void main() {
	textureCoord = texcoords;
	vColor = vertexColor;
	gl_Position = transform * vec4(position, 1);
}

// FRAGMENT

precision mediump float;

uniform sampler2D sampler1;

varying vec2 textureCoord;
varying vec4 vColor;

void main() {
	gl_FragColor = texture2D(sampler1, textureCoord) * vColor;
}
