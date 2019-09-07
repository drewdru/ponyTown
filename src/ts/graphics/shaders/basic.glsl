// VERTEX

attribute vec2 position;
attribute vec2 texcoords;

uniform mat4 transform;

varying vec2 textureCoord;

void main() {
	textureCoord = texcoords;
	gl_Position = transform * vec4(position, 0, 1);
}

// FRAGMENT

precision mediump float;

uniform sampler2D sampler1;

varying vec2 textureCoord;

void main() {
	gl_FragColor = texture2D(sampler1, textureCoord);
}
