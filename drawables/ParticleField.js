class ParticleField {
    constructor(gl, particles, boundingBox) {

        console.log("Particle Field")
        this.gl = gl;
        this.particles = particles;
        this.color = [.3, .6, .9, 1];
        this.boundingBox = boundingBox;

        this.particleRadius = .02;
        this.sideCount = 6;
        this.smoothingRadius = .1;

        this.targetDensity = 500;
        this.pressureMultiplier = .01;
        this.tick = 0;

        this.particleContainers = this.initParticleContainers();

    }

    initParticleContainers() {
        let numCols = Math.floor((this.boundingBox.right - this.boundingBox.left) / (this.smoothingRadius));
        let numRows = Math.floor((this.boundingBox.up - this.boundingBox.down) / this.smoothingRadius);

        let containers = [];
        for (let i = 0; i < numRows; i++) {
            let row = [];
            for (let j = 0; j < numCols; j++) {
                let particleList = [];
                row.push(particleList)
            }
            containers.push(row);
        }
        console.log("initContainers")
        console.log("particle rows: " + containers.length);
        console.log("cols: " + containers[0].length)
        return containers;
    }

    applyForce(location) {
        console.log("Apply Force: " + location);
        let scalar = .03;
        this.particles.forEach((p) => {
            let locToP = subtract(p.currPos, location);
            let magnitude = vectorMagnitude(locToP);
            let N = scaleVector(locToP, 1 / magnitude);
            let F = scaleVector(N, scalar / (magnitude * magnitude));

            p.applyForce(F);
        })
    }



    setBuffers() {
        let points = [];
        let colors = [];


        // this.particles.forEach(element => {
        //     let pos = element.currPos;
        //     points.push(regularPolygonVertices(pos, this.particleRadius, this.sideCount));
        // });

        let verticesPerParticle = this.sideCount * 3;
        let color;
        let vertices = [];
        // for (let i = 0; i < points.length; i++) {
        //     if (this.particles)
        //     for (let j = 0; j < verticesPerParticle; j++) {
        //         vertices.push(points[i][j]);
        //         if (i == 1) {
        //             colors.push([1, 0, 0, 1])
        //         } else {
        //             colors.push(this.color);

        //         }
        //     }
        // }

        for (let i = 0; i < this.particleContainers.length; i++) {
            for (let j = 0; j < this.particleContainers[i].length; j++) {
                for (let k = 0; k < this.particleContainers[i][j].length; k++) {






                    let particleData = this.particleContainers[i][j][k];
                    // let pressureForce = this.calculatePressureForce(i, j, k);
                    // let pressureForce2 = this.calculatePressureForce2(particleData.index);

                    points = (regularPolygonVertices(particleData.p.currPos, this.particleRadius, this.sideCount))
                    // if (Math.abs(particleData.d - this.targetDensity) < 1) {
                    if (particleData.lineIndex == 1) {
                        color = [1, 0, 1, 1];
                    } else {
                        color = [0, 0, 0, 1] // blue just right

                    }
                    // } else if (particleData.d < this.targetDensity) {
                    //     color = [1, 0, 0, 1]; // red too low
                    // } else {
                    //     color = [0, 1, 0, 1] // yellow too high
                    // }
                    // if (pressureForce[0] == pressureForce2[0] && pressureForce[1] == pressureForce2[1]) {
                    //     color = [0, 0, 1, 1]
                    // } else {
                    //     color = [1, 0, 0, 1]
                    // }
                    // if (i == 0 && j == 0) {
                    //     color = [1, 0, 0, 1]
                    // } else if (i == 0 && j == 1) {
                    //     color = [0, 1, 0, 1]
                    // } else if (i == 1 && j == 0) {
                    //     color = [0, 0, 1, 1]
                    // } else {
                    //     color = [1, 1, 0, 1]
                    // }
                    for (let l = 0; l < verticesPerParticle; l++) {
                        vertices.push(points[l])
                        colors.push(color)
                    }

                }
            }
        }



        this.numVertices = vertices.length;


        this.vBuff = loadBuffer(this.gl, new Float32Array(flatten(vertices)), this.gl.STATIC_DRAW);
        this.cBuff = loadBuffer(this.gl, new Float32Array(flatten(colors)), this.gl.STATIC_DRAW);
    }

    getSmoothingRadius() {
        return this.smoothingRadius;
    }

    setSmoothingRadius(smoothingRadius) {
        if (this.smoothingRadius != smoothingRadius) {
            this.smoothingRadius = smoothingRadius;
            this.particleContainers = this.initParticleContainers();
        }
    }

    ensureInBounds(p) {
        if (p.currPos[1] - this.particleRadius < this.boundingBox.down) {
            p.currPos[1] = this.boundingBox.down + this.particleRadius;
            p.currV[1] *= -1;
        }
        if (p.currPos[1] + this.particleRadius > this.boundingBox.up) {
            p.currPos[1] = this.boundingBox.up - this.particleRadius;
            p.currV[1] *= -1;
        }
        if (p.currPos[0] - this.particleRadius < this.boundingBox.left) {
            p.currPos[0] = this.boundingBox.left + this.particleRadius;
            p.currV[0] *= -1;
        }
        if (p.currPos[0] + this.particleRadius > this.boundingBox.right) {
            p.currPos[0] = this.boundingBox.right - this.particleRadius;
            p.currV[0] *= -1;
        }
    }

    update(dT) {

        this.densities = [];

        for (let i = 0; i < this.particleContainers.length; i++) {
            for (let j = 0; j < this.particleContainers[i].length; j++) {
                this.particleContainers[i][j] = [];
            }
        }

        this.tick++;


        for (let i = 0; i < this.particles.length; i++) {

            let currParticle = this.particles[i];
            let dampening = .99;
            currParticle.currV = scaleVector(currParticle.currV, dampening);

            let particleCol = Math.min(Math.floor((currParticle.currPos[0] + this.boundingBox.right) / this.smoothingRadius), this.particleContainers[0].length - 1);
            let particleRow = Math.min(Math.floor((currParticle.currPos[1] + this.boundingBox.up) / this.smoothingRadius), this.particleContainers.length - 1);

            // if (particleCol >= this.particleContainers[0].length) {
            //     console.log("breaking col: " + particleCol + ", " + this.particleContainers[0].length)
            // } else if (particleRow >= this.particleContainers.length) {
            //     console.log("breaking Row: " + particleRow + ", " + this.particleContainers.length)
            // }
            let index = this.particleContainers[particleRow][particleCol].length;

            this.particleContainers[particleRow][particleCol].push(
                {
                    p: currParticle,
                    index: index,
                    lineIndex: i,
                    d: this.calculateDensity(currParticle.currPos)

                }
            );

            this.densities.push(this.calculateDensity(currParticle.currPos));
        }





        for (let i = 0; i < this.particleContainers.length; i++) {
            for (let j = 0; j < this.particleContainers[i].length; j++) {


                for (let k = 0; k < this.particleContainers[i][j].length; k++) {
                    let currParticleData = this.particleContainers[i][j][k];
                    let currParticle = currParticleData.p;
                    //console.log(currParticle.currPos);
                    let pressureForce = this.calculatePressureForce(i, j, k);
                    //let pressureForce = this.calculatePressureForce2(currParticleData.lineIndex);

                    // console.log("*******\nNew: " + pressureForce + ", old " + pressureForce2 + "\n********\n")

                    let deltaV = scaleVector(pressureForce, (dT / currParticleData.d));
                    currParticle.currV = addVectors(deltaV, currParticle.currV)


                }
            }
        }


        // for (let i = 0; i < this.particles.length; i++) {
        //     let currParticle = this.particles[i];
        //     let pressureForce = this.calculatePressureForce(i);

        //     let deltaV = scaleVector(pressureForce, (dT / this.densities[i]));
        //     // currParticle.currV = addVectors(currParticle.currV, deltaV);

        // }



        this.particles.forEach((p) => {
            p.update(dT);
            this.ensureInBounds(p);

        })



        this.setBuffers();
    }

    calculatePressureForce(row, col, index) {
        let pressureForce = [0, 0, 0];
        let primaryParticleData = this.particleContainers[row][col][index];
        let primaryParticle = primaryParticleData.p;
        //console.log("PressureForce: " + row + ", " + col + ", " + index + ", " + primaryParticle.currPos)
        for (let i = row - 1; i <= row + 1; i++) {
            for (let j = col - 1; j <= col + 1; j++) {
                if (i >= 0 && j >= 0 && i < this.particleContainers.length && j < this.particleContainers[i].length) {
                    for (let k = 0; k < this.particleContainers[i][j].length; k++) {
                        if (i == row && j == col && k == index) continue;
                        let cPData = this.particleContainers[i][j][k];
                        let cP = cPData.p;

                        let btw = subtract(cP.currPos, primaryParticle.currPos);
                        let dst = vectorMagnitude(btw);
                        let dir;
                        if (dst == 0) {
                            dir = this.randomUnitVector();
                        } else {
                            dir = scaleVector(btw, (1 / dst));
                        }

                        let slope = this.smoothingKernelDerivative(this.smoothingRadius, dst);
                        let sharedPressure = this.sharedPressure(cPData.d, primaryParticleData.d);

                        let scale = slope / cPData.d;

                        let contribution = sharedPressure * scale;
                        let hereToThere = scaleVector(dir, contribution);
                        let thereToHere = scaleVector(dir, -contribution);
                        cP.currV = addVectors(cP.currV, thereToHere);
                        pressureForce = addVectors(pressureForce, hereToThere)

                    }
                }
            }
        }

        return pressureForce;
    }

    calculatePressureForce2(index) {
        let pressureForce = [0, 0, 0];
        let primaryParticle = this.particles[index];

        for (let i = 0; i < this.particles.length; i++) {
            if (index == i) continue;

            let cP = this.particles[i];
            let btw = subtract(cP.currPos, primaryParticle.currPos);
            let dst = vectorMagnitude(btw);
            let dir;
            if (dst == 0) {
                dir = this.randomUnitVector();
            } else if (dst > this.smoothingRadius) {
                continue;
            } else {
                dir = scaleVector(btw, (1 / dst));
            }


            let slope = this.smoothingKernelDerivative(this.smoothingRadius, dst);
            let sharedPressure = this.sharedPressure(this.densities[i], this.densities[index]);

            let scale = slope / this.densities[i];

            let contribution = sharedPressure * scale;
            let hereToThere = scaleVector(dir, contribution);
            let thereToHere = scaleVector(dir, -contribution);
            cP.currV = addVectors(cP.currV, thereToHere);
            pressureForce = addVectors(pressureForce, hereToThere)
        }

        return pressureForce;
    }

    sharedPressure(a, b) {
        let pressureA = this.convertDensityToPressure(a);
        let pressureB = this.convertDensityToPressure(b);

        return (pressureA + pressureB) / 2;
    }

    convertDensityToPressure(density) {

        let densityError = density - this.targetDensity;
        let pressure = densityError * this.pressureMultiplier;
        return pressure;
    }

    calculateDensity(samplePoint) {
        //console.log("samplePoint: " + samplePoint)
        let density = 0;

        let mass = 1;

        for (let i = 0; i < this.particles.length; i++) {
            let dst = vectorMagnitude(subtract(this.particles[i].currPos, samplePoint));
            let influence = this.smoothingKernel(this.smoothingRadius, dst);

            density += (influence * mass);
        }
        return density;
    }

    randomUnitVector() {
        let theta = getRandomFloat(0, 6.1);
        return [Math.cos(theta), Math.sin(theta), 0];
    }

    smoothingKernelDerivative(radius, dst) {
        if (dst >= radius) {
            return 0;
        }
        let l = (radius * radius - dst * dst);
        return (-12 * dst * (l * l)) / (Math.PI * Math.pow(radius, 6));
    }

    smoothingKernel(radius, dst) {
        let volume = Math.PI * Math.pow(radius, 6) / 3;
        let value = Math.max(0, radius * radius - dst * dst);
        return (value * value) / volume;
    }



    addRestoringForce(p, dT) {
        let awayFromHome = subtract(p.desiredPos, p.currPos);
        let magnitude = vectorMagnitude(awayFromHome);
        if (magnitude != 0) {

            let springConstant = 20;
            let restoringF = scaleVector(awayFromHome, magnitude * springConstant);
            p.currV = addVectors(p.currV, scaleVector(restoringF, dT))
        }
    }

    draw(programInfo, bufferAttributes) {
        let buffers = this.getBuffers();

        for (let i = 0; i < bufferAttributes.length; i++) {
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffers[i]);
            this.gl.vertexAttribPointer(programInfo.getBufferLocations()[i], bufferAttributes[i].size, bufferAttributes[i].type, bufferAttributes[i].normalize, bufferAttributes[i].stride, bufferAttributes[i].offset);
        }

        this.gl.drawArrays(this.getType(), 0, this.getNumVertices());

    }

    getType() {
        return this.gl.TRIANGLES;
    }

    getNumVertices() {
        return this.numVertices;
    }

    getBuffers() {
        return [this.vBuff, this.cBuff];
    }
}