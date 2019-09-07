// VERTEX

attribute vec2 position;
attribute vec4 texcoords;
attribute vec4 vertexColor;
attribute vec4 vertexColor1;

uniform mat4 transform;
uniform vec4 lighting;

varying vec4 textureCoord;
varying vec4 vColor;
varying vec4 vColor1;

void main() {
	textureCoord = texcoords;
	// float f = texcoords.z;
	// float fr = fract(texcoords.z);
	// textureCoord.z = fr;
	// textureCoord.w = (f - fr) / 1024.0;
	vColor = vertexColor * lighting;
	vColor1 = vertexColor1;
	gl_Position = transform * vec4(position, 0, 1);
}

// FRAGMENT

precision mediump float;

uniform sampler2D sampler1; // sprite
uniform sampler2D sampler2; // palette
uniform float pixelSize;
uniform float textureSize;

varying vec4 textureCoord;
varying vec4 vColor;
varying vec4 vColor1;

void main() {
	vec4 sprite = texture2D(sampler1, textureCoord.xy / textureSize);

	float shade = clamp(sprite.g + vColor1.a, 0.0, 1.0);

	vec4 mask = vec4(vColor1.rgb, 1.0 - (vColor1.r + vColor1.g + vColor1.b));
	float paletteIndex = dot(mask, sprite);

	vec2 paletteCoord = textureCoord.zw;
	vec4 palette = texture2D(sampler2, vec2(paletteCoord.x + paletteIndex * pixelSize, paletteCoord.y));

	gl_FragColor = vec4(palette.xyz * shade, palette.w) * vColor;
}
