// VERTEX

attribute vec2 position0;
attribute vec4 position1;
attribute vec4 texcoord0;
attribute vec2 texcoord1;
attribute vec4 vertexColor;
attribute vec4 vertexColor1;

uniform mat4 transform;
uniform vec4 lighting;

varying vec2 textureCoord0;
varying vec2 textureCoord1;
varying vec4 vColor;
varying vec4 vColor1;

void main() {
	textureCoord0 = vec2(texcoord0.x + position0.x * texcoord0.z, texcoord0.y + position0.y * texcoord0.w);
	textureCoord1 = texcoord1;
	vColor = vertexColor * lighting;
	vColor1 = vertexColor1;
	gl_Position = transform * vec4(
		position1.x + position0.x * position1.z, position1.y + position0.y * position1.w, 0, 1);
}

// FRAGMENT

precision mediump float;

uniform sampler2D sampler1; // sprite
uniform sampler2D sampler2; // palette
uniform float pixelSize;

varying vec2 textureCoord0;
varying vec2 textureCoord1;
varying vec4 vColor;
varying vec4 vColor1;

void main() {
	vec4 sprite = texture2D(sampler1, textureCoord0.xy);

	float shade = clamp(sprite.g + vColor1.a, 0.0, 1.0);

	vec4 mask = vec4(vColor1.rgb, 1.0 - (vColor1.r + vColor1.g + vColor1.b));
	float paletteIndex = dot(mask, sprite);

	vec4 palette = texture2D(sampler2, vec2(textureCoord1.x + paletteIndex * pixelSize, textureCoord1.y));

	gl_FragColor = vec4(palette.xyz * shade, palette.w) * vColor;
}
