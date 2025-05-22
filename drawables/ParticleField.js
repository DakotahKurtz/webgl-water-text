class ParticleField {
    constructor(gl, particles, boundingBox) {

        console.log("Particle Field")
        this.gl = gl;
        this.particles = particles;
        this.color = [.3, .6, .9, 1];
        this.boundingBox = boundingBox;

        this.particleRadius = .03;
        this.sideCount = 9;
        this.smoothingRadius = .2;

        this.targetDensity = 10;
        this.pressureMultiplier = .18;
        this.tick = 0;
        this.viscosityStrength = .22;

        this.slowColor = [70 / 255, 40 / 255, 250 / 255]
        this.fastColor = [180 / 255, 200 / 255, 250 / 255];

        this.cRange = subtract(this.fastColor, this.slowColor);

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

    applyUPForce(location, dT) {
        this.particles.forEach((p) => {
            let locToP = subtract(p.currPos, location);
            let magnitude = vectorMagnitude(locToP);
            if (magnitude < 1 && locToP[1] > 0) {
                let F = scaleVector([0, 8, 0], dT / (magnitude));

                p.currV = addVectors(p.currV, F)
            }

        })
    }

    applyForce(location, f) {
        this.particles.forEach((p) => {
            let locToP = subtract(p.currPos, location);
            let magnitude = vectorMagnitude(locToP);
            if (f > 0) {
                if (magnitude < 1) {
                    let N = scaleVector(locToP, 10 / magnitude);
                    let F = scaleVector(N, f);

                    p.applyForce(F);
                }
            } else {
                if (magnitude < 1) {
                    let N = scaleVector(locToP, magnitude);
                    let F = scaleVector(N, -1 / magnitude);

                    p.applyForce(F);
                }
            }


        })
    }



    setBuffers() {
        let points = [];
        let colors = [];


        let verticesPerParticle = this.sideCount * 3;
        let color;
        let vertices = [];





        for (let i = 0; i < this.particleContainers.length; i++) {
            for (let j = 0; j < this.particleContainers[i].length; j++) {
                for (let k = 0; k < this.particleContainers[i][j].length; k++) {

                    let particleData = this.particleContainers[i][j][k];

                    points = (regularPolygonVertices(particleData.p.currPos, this.particleRadius, this.sideCount))


                    let v1 = Math.min(vectorMagnitude(particleData.p.currV), 8);
                    let a = (v1 - 0) / 8;
                    //console.log(a)
                    let cProp = scaleVector(this.cRange, a);
                    let c = addVectors(this.slowColor, cProp);
                    // console.log(c);


                    for (let l = 0; l < verticesPerParticle; l++) {
                        vertices.push(points[l])
                        colors.push([c[0], c[1], c[2], 1])
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

        this.nextV = [];

        for (let i = 0; i < this.particleContainers.length; i++) {
            for (let j = 0; j < this.particleContainers[i].length; j++) {
                this.particleContainers[i][j] = [];
            }
        }

        this.tick++;

        for (let i = 0; i < this.particles.length; i++) {
            let currParticle = this.particles[i];
            this.nextV.push(currParticle.currV);



            let particleCol = Math.min(Math.floor((currParticle.currPos[0] + this.boundingBox.right) / this.smoothingRadius), this.particleContainers[0].length - 1);
            let particleRow = Math.min(Math.floor((currParticle.currPos[1] + this.boundingBox.up) / this.smoothingRadius), this.particleContainers.length - 1);

            let index = this.particleContainers[particleRow][particleCol].length;

            this.particleContainers[particleRow][particleCol].push(
                {
                    p: currParticle,
                    index: index,
                    lineIndex: i,
                    d: this.calculateDensity(currParticle.currPos)

                }
            );

        }

        for (let i = 0; i < this.particleContainers.length; i++) {
            for (let j = 0; j < this.particleContainers[i].length; j++) {
                for (let k = 0; k < this.particleContainers[i][j].length; k++) {
                    let currParticleData = this.particleContainers[i][j][k];

                    let neighbors = this.getNeighbors(i, j, k);

                    let pressureForce = this.calculatePressureForce(currParticleData, neighbors);
                    let deltaV = scaleVector(pressureForce, (dT / currParticleData.d));
                    this.nextV[currParticleData.lineIndex] = addVectors(deltaV, this.nextV[currParticleData.lineIndex])

                    let viscosityForce = this.calculateViscosityForce(currParticleData, neighbors);
                    this.nextV[currParticleData.lineIndex] = addVectors(scaleVector(viscosityForce, dT), this.nextV[currParticleData.lineIndex])

                }
            }
        }



        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].currV = this.nextV[i];

            this.particles[i].update(dT);
            this.ensureInBounds(this.particles[i]);

            let dampening = .99;
            this.particles[i].currV = scaleVector(this.particles[i].currV, dampening);
            this.particles[i].updatePosPrediction(dT);

        }

        this.setBuffers();
    }

    getNeighbors(row, col, index) {
        let neighbors = [];
        for (let i = row - 1; i <= row + 1; i++) {
            for (let j = col - 1; j <= col + 1; j++) {
                if (i >= 0 && j >= 0 && i < this.particleContainers.length && j < this.particleContainers[i].length) {
                    for (let k = 0; k < this.particleContainers[i][j].length; k++) {
                        if (i == row && j == col && k == index) continue;
                        neighbors.push(this.particleContainers[i][j][k])
                    }
                }
            }
        }
        return neighbors;
    }

    calculateViscosityForce(particleData, neighbors) {
        let viscosityForce = [0, 0, 0];
        let currParticle = particleData.p;

        neighbors.forEach((otherParticleData) => {
            let dst = vectorMagnitude(subtract(currParticle.currPos, otherParticleData.p.currPos));
            let influence = this.smoothingKernel(this.smoothingRadius, dst);
            if (influence != 0) {
                let vDst = subtract(currParticle.currV, otherParticleData.p.currV);
                let scaled = scaleVector(vDst, -influence / 2);
                viscosityForce = addVectors(viscosityForce, scaled);
            }

        });

        return scaleVector(viscosityForce, this.viscosityStrength);
    }

    calculatePressureForce(particle, neighbors) {
        let pressureForce = [0, 0, 0];
        let primaryParticle = particle.p;
        neighbors.forEach((otherParticleData) => {
            let cP = otherParticleData.p;

            let btw = subtract(cP.posPrediction, primaryParticle.posPrediction);
            let dst = vectorMagnitude(btw);
            let dir;
            if (dst == 0) {
                dir = this.randomUnitVector();
            } else {
                dir = scaleVector(btw, (1 / dst));
            }

            let slope = this.smoothingKernelDerivative(this.smoothingRadius, dst);
            let sharedPressure = this.sharedPressure(otherParticleData.d, particle.d);

            let scale = slope / otherParticleData.d;

            let contribution = sharedPressure * scale;
            let hereToThere = scaleVector(dir, contribution);
            let thereToHere = scaleVector(dir, -contribution);
            this.nextV[otherParticleData.lineIndex] = addVectors(this.nextV[otherParticleData.lineIndex], thereToHere);
            pressureForce = addVectors(pressureForce, hereToThere)
        })




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