#pragma glslify: noise = require('glsl-noise/simplex/3d')

// 顶点着色器
const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 片元着色器
const fragmentShader = `
  uniform sampler2D texture;
  varying vec2 vUv;

  void main() {
    vec4 sum = vec4(0.0);
    float totalWeight = 0.0;
  
    // 迭代计算周围像素的模糊值
    for (float dx = -1.0; dx <= 1.0; dx++) {
      for (float dy = -1.0; dy <= 1.0; dy++) {
        vec2 offset = vec2(dx, dy);
        vec4 texel = texture2D(texture, vUv + offset);
        float weight = 1.0 / (1.0 + abs(dx) + abs(dy)); // 虚化的权重值
        sum += texel * weight;
        totalWeight += weight;
      }
    }
  
    vec4 blurredColor = sum / totalWeight; // 计算最终的虚化颜色值
    gl_FragColor = blurredColor;
  }
`;

const blurredMaterial = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    // 在这里添加需要的uniform变量
    texture: { value: yourTexture }, // 根据实际情况设置纹理
  },
});