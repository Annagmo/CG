"use strict";

// This is not a full .obj parser.
// see http://paulbourke.net/dataformats/obj/

function parseOBJ(text) {
  // because indices are base 1 let's just fill in the 0th data
  const objPositions = [[0, 0, 0]];
  const objTexcoords = [[0, 0]];
  const objNormals = [[0, 0, 0]];

  // same order as `f` indices
  const objVertexData = [
    objPositions,
    objTexcoords,
    objNormals,
  ];

  // same order as `f` indices
  let webglVertexData = [
    [],   // positions
    [],   // texcoords
    [],   // normals
  ];

  const materialLibs = [];
  const geometries = [];
  let geometry;
  let groups = ['default'];
  let material = 'default';
  let object = 'default';

  const noop = () => {};

  function newGeometry() {
    // If there is an existing geometry and it's
    // not empty then start a new one.
    if (geometry && geometry.data.position.length) {
      geometry = undefined;
    }
  }

  function setGeometry() {
    if (!geometry) {
      const position = [];
      const texcoord = [];
      const normal = [];
      webglVertexData = [
        position,
        texcoord,
        normal,
      ];
      geometry = {
        object,
        groups,
        material,
        data: {
          position,
          texcoord,
          normal,
        },
      };
      geometries.push(geometry);
    }
  }

  function addVertex(vert) {
    const ptn = vert.split('/');
    ptn.forEach((objIndexStr, i) => {
      if (!objIndexStr) {
        return;
      }
      const objIndex = parseInt(objIndexStr);
      const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
      webglVertexData[i].push(...objVertexData[i][index]);
    });
  }

  const keywords = {
    v(parts) {
      objPositions.push(parts.map(parseFloat));
    },
    vn(parts) {
      objNormals.push(parts.map(parseFloat));
    },
    vt(parts) {
      // should check for missing v and extra w?
      objTexcoords.push(parts.map(parseFloat));
    },
    f(parts) {
      setGeometry();
      const numTriangles = parts.length - 2;
      for (let tri = 0; tri < numTriangles; ++tri) {
        addVertex(parts[0]);
        addVertex(parts[tri + 1]);
        addVertex(parts[tri + 2]);
      }
    },
    s: noop,    // smoothing group
    mtllib(parts, unparsedArgs) {
      // the spec says there can be multiple filenames here
      // but many exist with spaces in a single filename
      materialLibs.push(unparsedArgs);
    },
    usemtl(parts, unparsedArgs) {
      material = unparsedArgs;
      newGeometry();
    },
    g(parts) {
      groups = parts;
      newGeometry();
    },
    o(parts, unparsedArgs) {
      object = unparsedArgs;
      newGeometry();
    },
  };

  const keywordRE = /(\w*)(?: )*(.*)/;
  const lines = text.split('\n');
  for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
    const line = lines[lineNo].trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const m = keywordRE.exec(line);
    if (!m) {
      continue;
    }
    const [, keyword, unparsedArgs] = m;
    const parts = line.split(/\s+/).slice(1);
    const handler = keywords[keyword];
    if (!handler) {
      console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
      continue;
    }
    handler(parts, unparsedArgs);
  }

  // remove any arrays that have no entries.
  for (const geometry of geometries) {
    geometry.data = Object.fromEntries(
        Object.entries(geometry.data).filter(([, array]) => array.length > 0));
  }

  return {
    geometries,
    materialLibs,
  };
}

async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Tell the twgl to match position with a_position etc..
  twgl.setAttributePrefix("a_");

  const vs = `#version 300 es
  in vec4 a_position;
  in vec3 a_normal;
  in vec2 a_texcoord;

  uniform mat4 u_projection;
  uniform mat4 u_view;
  uniform mat4 u_world;

  out vec3 v_normal;
  // a varying to pass the texture coordinates to the fragment shader
  out vec2 v_texcoord;

  void main() {
    gl_Position = u_projection * u_view * u_world * a_position;
    v_normal = mat3(u_world) * a_normal;
    // Pass the texcoord to the fragment shader.
    v_texcoord = a_texcoord;
  }
  `;

  const fs = `#version 300 es
  precision highp float;

  in vec3 v_normal;
  in vec2 v_texcoord;

  uniform vec4 u_diffuse;
  uniform vec3 u_lightDirection;
  // The texture.
  uniform sampler2D u_texture;

  out vec4 outColor;

  void main () {
    vec3 normal = normalize(v_normal);
    float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
    outColor = vec4(u_diffuse.rgb * fakeLight, u_diffuse.a);
    //outColor = texture(u_texture, v_texcoord);

  }
  `;


  // compiles and links the shaders, looks up attribute and uniform locations
  const meshProgramInfo = twgl.createProgramInfo(gl, [vs, fs]);

  //ANNA: FILE, RESPONSE, TEXT E OBJ dos 3 objetos 
  const firstObjFile = "lighthouse.obj"; 
  const secondObjFie = "turtle.obj"; 
  const thirdObjFile = "hammer.obj"; 

  const firstObjRes = await fetch(firstObjFile); 
  const secondObjRes = await fetch(secondObjFie); 
  const thirdObjRes = await fetch(thirdObjFile); 

  const firstObjText = await firstObjRes.text();
  const secondObjText = await secondObjRes.text();
  const thirdObjText = await thirdObjRes.text();

  const obj = parseOBJ(firstObjText);
  const secondObj = parseOBJ(secondObjText);
  const thirdObj = parseOBJ(thirdObjText);


  //ANNA: PARTS primeiro objeto
  const parts = obj.geometries.map(({data}) => {
    // Because data is just named arrays like this
    //
    // {
    //   position: [...],
    //   texcoord: [...],
    //   normal: [...],
    // }
    //
    // and because those names match the attributes in our vertex
    // shader we can pass it directly into `createBufferInfoFromArrays`
    // from the article "less code more fun".

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [Math.random(), Math.random(), Math.random(), 1],
      },
      bufferInfo,
      vao,
    };
  });

  //ANNA: PARTS segundo objeto
  const PartsSecondOBJ = secondObj.geometries.map(({data}) => {
    // Because data is just named arrays like this
    //
    // {
    //   position: [...],
    //   texcoord: [...],
    //   normal: [...],
    // }
    //
    // and because those names match the attributes in our vertex
    // shader we can pass it directly into `createBufferInfoFromArrays`
    // from the article "less code more fun".

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [Math.random(), Math.random(), Math.random(), 1],
      },
      bufferInfo,
      vao,
    };
  });

    //ANNA: PARTS terceiro objeto
  const PartsThirdOBJ = thirdObj.geometries.map(({data}) => {
    // Because data is just named arrays like this
    //
    // {
    //   position: [...],
    //   texcoord: [...],
    //   normal: [...],
    // }
    //
    // and because those names match the attributes in our vertex
    // shader we can pass it directly into `createBufferInfoFromArrays`
    // from the article "less code more fun".

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, data);
    const vao = twgl.createVAOFromBufferInfo(gl, meshProgramInfo, bufferInfo);
    return {
      material: {
        u_diffuse: [Math.random(), Math.random(), Math.random(), 1],
      },
      bufferInfo,
      vao,
    };
  });


  function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return {min, max};
  }

  function getGeometriesExtents(geometries) {
    return geometries.reduce(({min, max}, {data}) => {
      const minMax = getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
      };d
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }

  const extents = getGeometriesExtents(obj.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);
  // amount to move the object so its center is at the origin
  const objOffset = m4.scaleVector(
      m4.addVectors(
        extents.min,
        m4.scaleVector(range, 0.5)),
      -1);

  var cameraTarget = [0, 0, 0];
  // figure out how far away to move the camera so we can likely
  // see the object.
  const radius = m4.length(range) * 1.2;
  const cameraPosition = m4.addVectors(cameraTarget, [
    radius,
    0,
    0,
  ]);
  
  //---- ANNA: ATUALIZAÃ‡ÃƒO DA CAMERA -----
  //cameraPosition[0] = ponto no eixo X
  //cameraPosition[1] = ponto no eixo Y


  // Set zNear and zFar to something hopefully appropriate
  // for the size of this object.
  const zNear = radius / 100;
  const zFar = radius * 3;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }
  //PONTOS:
  
  //COM NAOMI
  const v3 = twgl.v3
  let posC = [0,0,0];
	let posP4 = 0.0;
  let vecSpd = [0, 0, 0];

  const p_t = {
    A:  v3.create(-0.12841, -0.89016),
    B:  v3.create(0.17065, -0.92396),
    C:  v3.create(0.14275, -1.03559),
    D:  v3.create(0.01995, -1.0021),
    E:  v3.create(-0.1037, -0.98899),

    P1: v3.create(-0.10098, -0.84582),
    P2: v3.create(0.21903, -0.89605),
    P4: v3.create(0.24321, -1.01884),
    P6: v3.create(0.17053, -0.98746),
    P8: v3.create(-0.09192, -1.18147)
  }

  const bez1 = [
      p_t.A,
      p_t.P1,
      p_t.P2,
      p_t.B,
  ]

  const bez2 = [
      p_t.B,
      v3.subtract( v3.mulScalar( bez1[3], 2 ), bez1[2] ), // P3 = 2B - P2
      p_t.P4,
      //v3.add( bez1[1], v3.mulScalar( v3.subtract( bez1[3], bez1[2] ), 4 ) ), // P4 = P1 + 4( B - P2 )
      p_t.C,
  ]
  const bez3 = [
      p_t.C,
      v3.subtract( v3.mulScalar( bez2[3], 2 ), bez2[2] ), // P5 = 2C - P4
      p_t.P6,
      //v3.add( bez2[1], v3.mulScalar( v3.subtract( bez2[3], bez2[2] ), 4 ) ), // P6 = P3 + 4( C - P4 )
      p_t.D,
  ]

  const bez4 = [
      p_t.D,
      v3.subtract( v3.mulScalar( bez3[3], 2 ), bez3[2] ), // P7 = 2D - P6
      p_t.P8,
      //v3.add( bez3[1], v3.mulScalar( v3.subtract( bez3[3], bez3[2] ), 4 ) ), // P8 = P5 + 4( D - P6 )
      p_t.E,
  ]
  //BEZIER:
    const Bezier = (v3, A, P1, P2, B, t ) => {
    const h1 = ( - Math.pow( t, 3 ) ) + ( 3 * Math.pow( t, 2 ) ) - ( 3 * t ) + 1;
    const h2 = ( 3 * Math.pow( t, 3 ) ) - ( 6 * Math.pow( t, 2 ) ) + ( 3 * t );
    const h3 = - ( 3 * Math.pow( t, 3 ) ) + ( 3 * Math.pow( t, 2 ) );
    const h4 = Math.pow( t, 3 );

    const temp1 = v3.add( v3.mulScalar( A, h1 ), v3.mulScalar( P1, h2 ) );
    const temp2 = v3.add( v3.mulScalar( P2, h3 ), v3.mulScalar( B, h4 ) );    

    const bez = v3.add( temp1, temp2 );
                    
    return [bez[0], 0, bez[1]];
    }
  
  var posP = 0.0;
  const BezierDX = ( v3, A, P1, P2, B, t ) => {
    // -3(1-t)^2 * P0 + 3(1-t)^2 * P1 - 6t(1-t) * P1 - 3t^2 * P2 + 6t(1-t) * P2 + 3t^2 * P3
    const d1 = ( 3 * Math.pow( 1 - t, 2 ) );
    const d2 = v3.subtract( P1, A );
    const d3 = ( 6 * ( 1 - t ) ) * t;
    const d4 = v3.subtract( P2, P1 );
    const d5 = ( 3 * Math.pow( t, 2 ) );
    const d6 = v3.subtract( B, P2 );

    const c1 = v3.mulScalar( d2, d1 );
    const c2 = v3.mulScalar( d4, d3 );
    const c3 = v3.mulScalar( d6, d5 );

    const bez = v3.add( c1, v3.add( c2, c3 ) );

    return [bez[0], 0, bez[1]]; 
  }

  // Setup a ui.
  webglLessonsUI.setupSlider( "#eixoZ", {
    value: posP, slide: updateCameraPos, min: 0.0, max: 100.0
  } );

  function updateCameraPos( event, ui )
  {
    posP = ui.value/100;
    render();
  }
  //----ANNA: MOVIMENTAÃ‡ÃƒO TURTLE E SHARK----
  var shark = 0;//FORA DO RENDER!!!!!!
  var turtle = 0;

  function render(time) {
    
    gl.clear


    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
		time *= 0.001;  // convert to seconds

    posP4 = posP * 4;
		if ( ( posP4 )  <= 1 )
		{
			// 1st curve
			posC = Bezier( v3, bez1[0], bez1[1], bez1[2], bez1[3], posP4 );
			vecSpd = BezierDX( v3, bez1[0], bez1[1], bez1[2], bez1[3], posP4 );
		} else if ( ( posP4 ) <= 2 ) {
			// 2nd curve
			posC = Bezier( v3, bez2[0], bez2[1], bez2[2], bez2[3], posP4 - 1 );
			vecSpd = BezierDX( v3, bez2[0], bez2[1], bez2[2], bez2[3], posP4 - 1 );
		} else if ( ( posP4 )  <= 3 ) {
			// 3rd curve
			posC = Bezier( v3, bez3[0], bez3[1], bez3[2], bez3[3], posP4 - 2 );
			vecSpd = BezierDX( v3, bez3[0], bez3[1], bez3[2], bez3[3], posP4 - 2 );
		} else {
			// 4th curve
			posC = Bezier( v3, bez4[0], bez4[1], bez4[2], bez4[3], posP4 - 3 );
			vecSpd = BezierDX( v3, bez4[0], bez4[1], bez4[2], bez4[3], posP4 - 3 );
		}
    
    console.log( posC );//LOG

    cameraTarget = m4.addVectors( posC, vecSpd );//Camera Target


    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const up = [0, 1, 0];
    // Compute the camera's matrix using look at.
    const camera = m4.lookAt(posC, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
    };

    gl.useProgram(meshProgramInfo.program);

    // calls gl.uniform
    twgl.setUniforms(meshProgramInfo, sharedUniforms);

    // compute the world matrix once since all parts
    // are at the same space.
    let u_world = m4.identity();
    u_world = m4.scale(u_world, 0.03, 0.03, 0.03)
    u_world = m4.yRotate(u_world, 1.57);
    u_world = m4.translate( u_world, 5 * posC[0], -5, 0 * posC[1] );



    //---- ANNA: DRAW primeiro objeto----
    for (const {bufferInfo, vao, material} of parts) {
      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {
        u_world,
        u_diffuse: material.u_diffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, bufferInfo);
    }


    //----ANNA: Colocar os objetos em diferentes posiÃ§Ãµes:----

    //lighthouse
    // u_world normal.

    //turtle
    turtle += 0.003; //velocidade do movimento devido Ã  diferenÃ§a do seno. 1 = frenÃ©tico.
    var u_worldEscalado1;
    var  u_worldTransladado1;

    function transladaTurtle (turtle){
      u_worldEscalado1 = m4.scale(u_world, 0.4, 0.4, 0.4);
      turtle = Math.sin(turtle)* 15;
      u_worldTransladado1 = m4.translate(u_worldEscalado1, -12, 15, turtle);
      return u_worldTransladado1;
    }

    //shark
    shark += 0.003;
    var u_worldEscalado2;
    var  u_worldTransladado2;

    function transladaShark (shark){
      u_worldEscalado2 = m4.scale(u_world, 0.02, 0.02, 0.02);
      shark = (-Math.sin(shark)) * 200; //o - p/ eles me movimentarem de forma oposta e ficar bonito.
      u_worldTransladado2 = m4.translate(u_worldEscalado2, 300, 400, shark); //-200 - 200 
      return u_worldTransladado2;
    }


    //----ANNA: DRAW segundo objeto:----

    for (const { bufferInfo, vao, material } of PartsSecondOBJ) {

      //movimenta obj
      u_worldTransladado1 = transladaTurtle(turtle);


      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {
        u_world: u_worldTransladado1,
        u_diffuse: material.u_diffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    //----ANNA: DRAW terceiro objeto----
    for (const { bufferInfo, vao, material } of PartsThirdOBJ) {

      //movimenta obj
      u_worldTransladado2 = transladaShark(shark);
      

      // set the attributes for this part.
      gl.bindVertexArray(vao);
      // calls gl.uniform
      twgl.setUniforms(meshProgramInfo, {
        u_world: u_worldTransladado2,
        u_diffuse: material.u_diffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    gl.clear

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

