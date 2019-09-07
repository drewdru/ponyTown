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

uniform sampler2D sampler1;
uniform float textureSize;

varying vec2 textureCoord;
varying vec4 vColor;

void main() {
	gl_FragColor = texture2D(sampler1, textureCoord / textureSize) * vColor;
}
