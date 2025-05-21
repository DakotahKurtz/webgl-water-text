"use strict";






var then = 0;
var animID;
var isPlaying = false;
const pressedKeys = {}
var boundingFar = 10;
var boundingNear = .01;
var boundingInc = .1;
var depthChangeInc = .1;
var cameraAtInc = 2;
var angleInc = .05;
var pointSize = 10;


window.onload = () => {
    var canvas = document.getElementById("gl-canvas");

    var gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }



    var programDataSparse = new ProgramData(gl, "vertex-shader-sparse", "fragment-shader-sparse",
        ["vPosition", "a_color"],);



    var sparseUniforms = {
        "modelView": 0,
        "projection": 0,
        "objectMatrix": flatten(identity()),
        "pointSize": pointSize,
    }

    var programUniformCorrespondence = (program, uniforms) => {
        for (const [name] of Object.entries(uniforms)) {
            program.getUniformInfo(name);
        }

        return {
            program: program,
            uniforms: uniforms,
            drawableObjects: []
        }
    }

    var DrawableTypes = {
        "Sparse": programUniformCorrespondence(programDataSparse, sparseUniforms),
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    var aspect = canvas.width / canvas.height;

    var cameraLocation = [0, 0, 8];
    var lookingAt = [0, 0, 0];
    var camera = new Camera(cameraLocation, lookingAt, [0, 1, 0]);
    var boundingNear = .3;
    var boundingFar = 100;
    var viewAngle = 30;



    var particles = [];

    let width = 1.5;
    let height = 1;
    let dimension = 4;
    let rows = 30;
    let cols = 20;
    let numParticles = 1000;

    let spacing = .1;
    let displayW = 2 * (width - spacing);
    let displayH = 2 * (height - spacing);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let x = (-width + spacing) + i * (displayW) / rows;
            let y = (-height + spacing) + j * (displayH) / cols;
            particles.push(new Particle([x, y, 0], [x, y, 0], [0, 0, 0], [0, -1, 0]))
        }
    }

    // for (let i = 0; i < numParticles; i++) {
    //     let x = getRandomFloat((-width + spacing) / 2, width - spacing)
    //     let y = getRandomFloat(-height + spacing, height - spacing);
    //     let z = 0;
    //     particles.push(new Particle([x, y, z], [x, y, z], [0, 0, 0], [0, -1, 0]));
    // }

    var boundingBox = new BoundingBox2D(
        gl, -width, width, height, -height);

    var particleField = new ParticleField(gl, particles, boundingBox);

    var particleFieldObject = DrawableObject(particleField,
        programDataSparse,
        [bufferAttributes(3, gl.FLOAT), bufferAttributes(4, gl.FLOAT)],
    );

    var boundingBoxObject = DrawableObject(boundingBox,
        programDataSparse,
        [bufferAttributes(3, gl.FLOAT), bufferAttributes(4, gl.FLOAT)],
    );


    canvas.addEventListener('click', (event) => {
        // Get the canvas's position in the page

        let intersection = findIntersection(event);

        if (pressedKeys["q"]) {
            particleField.applyForce(intersection);

        }
        console.log(particleField.calculateDensity(intersection))

    });

    document.addEventListener("keypress", (e) => {
        if (e.key == " ") {
            render(.015);
        }


    })

    manageControls();

    startAnimation();

    function startAnimation() {
        if (isPlaying) {
            cancelAnimationFrame(animID);
        }
        isPlaying = true;
        animID = requestAnimationFrame(render);
    }


    function render(now) {

        now *= 0.001;
        let deltaTime = .015;
        then = now;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        DrawableTypes["Sparse"].drawableObjects.push(
            LookAtBox(camera),
        );

        let mvMatrix = camera.getViewMatrix();
        let eye = camera.getPosition();

        let pMatrix = perspective(viewAngle, aspect, boundingNear, boundingFar);


        programDataSparse.use();
        sparseUniforms["modelView"] = flatten(mvMatrix);
        sparseUniforms["projection"] = flatten(pMatrix);



        setUniforms(sparseUniforms, programDataSparse);
        particleFieldObject.drawable.update(deltaTime)
        particleFieldObject.draw();

        boundingBoxObject.draw();


        animID = requestAnimationFrame(render);
    }

    function findIntersection(event) {
        const rect = canvas.getBoundingClientRect();

        // Mouse position within the canvas
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;


        const clipX = (x / canvas.width) * 2 - 1;
        const clipY = -((y / canvas.height) * 2 - 1);


        let mvMatrix = camera.getViewMatrix();
        let pMatrix = perspective(viewAngle, aspect, boundingNear, boundingFar);
        let transform = mult(pMatrix, mvMatrix);
        let inverse = inverse4(transform);

        const nearPoint = [clipX, clipY, -1, 1];
        const farPoint = [clipX, clipY, 1, 1];

        const nearWorld = mult(inverse, nearPoint);
        const farWorld = mult(inverse, farPoint);



        for (let i = 0; i < 3; i++) {
            nearWorld[i] /= nearWorld[3];
            farWorld[i] /= farWorld[3];
        }

        const rayDir = normalize(subtract(farWorld, nearWorld));

        const t = -nearWorld[2] / rayDir[2];
        return [
            nearWorld[0] + rayDir[0] * t,
            nearWorld[1] + rayDir[1] * t,
            0,
        ];
    }



    function LookAtBox(camera) {
        let size = .1;
        let position = camera.lookingAt;
        return DrawableObject(new TransparentBox(gl, size, position), programDataSparse,
            [bufferAttributes(3, gl.FLOAT), bufferAttributes(4, gl.FLOAT)],
        );
    }

    function manageControls() {


        document.addEventListener('keydown', (event) => {
            pressedKeys[event.key] = true;
        });

        document.addEventListener('keyup', (event) => {
            delete pressedKeys[event.key];
        });



        document.addEventListener('keydown', function (event) {






            if (event.key == '0') {
                camera.setLocked(!camera.isLocked());
            }

            if (pressedKeys["Shift"]) {
                //adjustControlArray(event, lookingAt, lookInc);

                switch (event.key) {
                    case ("ArrowLeft"):
                        camera.rotateTheta(angleInc);
                        break;
                    case ("ArrowRight"):
                        camera.rotateTheta(-angleInc);
                        break;
                    case ("ArrowDown"):

                        camera.rotatePhi(-angleInc);
                        break;
                    case ("ArrowUp"):
                        camera.rotatePhi(angleInc);
                        break;
                    case ("f"):
                    case ("F"):
                        camera.forward(cameraAtInc)
                        break;
                    case ("b"):
                    case ("B"):
                        camera.backward(cameraAtInc)
                        break;
                    case ("r"):
                    case ("R"):
                        camera.right(cameraAtInc)
                        break;
                    case ("l"):
                    case ("L"):
                        camera.left(cameraAtInc)
                        break;
                    case ("i"):
                    case ("I"):
                        camera.updateFocusDepth(1 - depthChangeInc);
                        break;
                    case ("o"):
                    case ("O"):
                        camera.updateFocusDepth(1 + depthChangeInc);
                        break;
                    case ("n"):
                    case ("N"):
                        boundingNear += boundingInc;
                        break;
                    case ("e"):
                    case ("E"):
                        boundingFar += boundingInc;
                        break;
                    case ("a"):
                    case ("A"):

                        viewAngle -= angleInc;
                        break;

                }
            } else if (pressedKeys["p"]) {
                switch (event.key) {
                    case ("ArrowLeft"):
                        particleField.pressureMultiplier -= .01
                        break;
                    case ("ArrowRight"):
                        particleField.pressureMultiplier += .01;
                        break;
                    case ("ArrowUp"):
                        particleField.targetDensity += 1;
                        break;
                    case ("ArrowDown"):
                        particleField.targetDensity -= 1;
                        break;
                    case ("i"):
                        particleField.setSmoothingRadius(particleField.getSmoothingRadius() - .01);
                        break;
                    case ("o"):
                        particleField.setSmoothingRadius(particleField.getSmoothingRadius() + .01);
                        break;

                }

                console.log("ParticleField | target: " + particleField.targetDensity + ", pressure: " + particleField.pressureMultiplier)
                console.log("Smoothing radius: " + particleField.smoothingRadius)
            }
            else {
                //adjustControlArray(event, cameraLocation, cameraAtInc);

                switch (event.key) {
                    case ("ArrowLeft"):
                        camera.updatePosition([-cameraAtInc, 0, 0]);
                        break;
                    case ("ArrowRight"):
                        camera.updatePosition([cameraAtInc, 0, 0]);
                        break;
                    case ("ArrowDown"):
                        camera.updatePosition([0, -cameraAtInc, 0]);
                        break;
                    case ("ArrowUp"):
                        camera.updatePosition([0, cameraAtInc, 0]);
                        break;
                    case ("f"):
                    case ("F"):
                        camera.updatePosition([0, 0, -cameraAtInc]);
                        break;
                    case ("b"):
                    case ("B"):
                        camera.updatePosition([0, 0, cameraAtInc]);
                        break;
                    case ("n"):
                    case ("N"):
                        boundingNear -= boundingInc;
                        break;
                    case ("e"):
                    case ("E"):
                        boundingFar -= boundingInc;
                        break;
                    case ("a"):
                    case ("A"):
                        viewAngle = Math.min(355, viewAngle + angleInc);
                        break;
                }

            }


            //startAnimation();

        });
    }
}








function adjustControlArray(event, array, inc) {


    switch (event.key) {
        case ("ArrowLeft"):
            array[0] -= inc;
            break;
        case ("ArrowRight"):
            array[0] += inc;
            break;
        case ("ArrowDown"):
            array[1] -= inc;
            break;
        case ("ArrowUp"):
            array[1] += inc;
            break;
        case ("f"):
        case ("F"):
            array[2] -= inc;
            break;
        case ("b"):
        case ("B"):
            array[2] += inc;
            break;
    }


}