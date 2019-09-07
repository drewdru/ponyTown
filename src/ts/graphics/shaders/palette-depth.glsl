// VERTEX

attribute vec3 position;
attribute vec4 texcoords;
attribute vec4 vertexColor;

uniform mat4 transform;
uniform vec4 lighting;

varying vec4 textureCoord;
varying vec4 vColor;

void main() {
	textureCoord = texcoords;
	vColor = vertexColor * lighting;
	gl_Position = transform * vec4(position, 1);
}

// FRAGMENT

precision mediump float;

uniform sampler2D sampler1; // sprite
uniform sampler2D sampler2; // palette
uniform float pixelSize;

varying vec4 textureCoord;
varying vec4 vColor;

void main() {
	vec4 sprite = texture2D(sampler1, vec2(textureCoord.x, textureCoord.y));
	vec4 palette = texture2D(sampler2, vec2(textureCoord.z + sprite.x * pixelSize, textureCoord.w));
	vec4 color = vec4(palette.xyz * sprite.y, palette.w) * vColor;

	gl_FragColor = color;

	if (color.a < 0.01)
		discard;
}
