const canvas = document.getElementById("canvas");
        const gl = canvas.getContext("webgl2");

        if (!gl) {
            alert("WebGL 2 is not supported by your browser.");
        }

        const bullets = [];
        const maxBullets = 5;

        canvas.addEventListener("mousedown", (e) => {
            if (bullets.length < maxBullets) {
                const bullet = {
                    x: 0,
                    y: 0,
                    z: 0,
                    speed: 0.02,
                };

                const viewport = canvas.getBoundingClientRect();
                const mouseX = e.clientX - viewport.left;
                const mouseY = canvas.height - (e.clientY - viewport.top);

                bullet.x = (mouseX / canvas.width) * 2 - 1;
                bullet.y = (mouseY / canvas.height) * 2 - 1;

                bullets.push(bullet);
            }
        });

        function drawScene() {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            for (let i = 0; i < bullets.length; i++) {
                const bullet = bullets[i];

                const bulletVertices = new Float32Array([
                    bullet.x - 0.02, bullet.y - 0.02,
                    bullet.x + 0.02, bullet.y - 0.02,
                    bullet.x + 0.02, bullet.y + 0.02,
                    bullet.x - 0.02, bullet.y + 0.02,
                ]);

                const bulletVertexBuffer = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, bulletVertexBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, bulletVertices, gl.STATIC_DRAW);

                const shaderProgram = createShaderProgram(gl);
                gl.useProgram(shaderProgram);

                const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
                gl.enableVertexAttribArray(positionAttributeLocation);
                gl.bindBuffer(gl.ARRAY_BUFFER, bulletVertexBuffer);
                gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

                gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
            }
        }

        function createShaderProgram(gl) {
            const vsSource = `
                attribute vec2 a_position;
                void main(void) {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `;

            const fsSource = `
                precision mediump float;
                void main(void) {
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `;

            const vertexShader = compileShader(gl, vsSource, gl.VERTEX_SHADER);
            const fragmentShader = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);

            const shaderProgram = gl.createProgram();
            gl.attachShader(shaderProgram, vertexShader);
            gl.attachShader(shaderProgram, fragmentShader);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
                return null;
            }

            return shaderProgram;
        }

        function compileShader(gl, source, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }

        function update() {
            drawScene();
            requestAnimationFrame(update);
        }

        update();