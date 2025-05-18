class ParticleField {
    constructor(gl, particles, boundingBox) {

        console.log("Particle Field")
        this.gl = gl;
        this.particles = particles;
        this.color = [.3, .6, .9, 1];
        this.boundingBox = boundingBox;

        this.particleRadius = .02;
        this.sideCount = 9;
        this.smoothingRadius = .1;

        this.targetDensity = 10;
        this.pressureMultiplier = 1;
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


        this.particles.forEach(element => {
            let pos = element.currPos;
            points.push(regularPolygonVertices(pos, this.particleRadius, this.sideCount));
        });
        this.color = [.2, .5, .8, 1];

        let vertices = [];
        for (let i = 0; i < points.length; i++) {
            for (let j = 0; j < points[i].length; j++) {
                vertices.push(points[i][j]);
                if (i == 1) {
                    colors.push([1, 0, 0, 1])
                } else {
                    colors.push(this.color);

                }
            }
        }



        this.numVertices = vertices.length;


        this.vBuff = loadBuffer(this.gl, new Float32Array(flatten(vertices)), this.gl.STATIC_DRAW);
        this.cBuff = loadBuffer(this.gl, new Float32Array(flatten(colors)), this.gl.STATIC_DRAW);
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

        for (let i = 0; i < this.particles.length; i++) {
            let currParticle = this.particles[i];
            let dampening = .99;
            currParticle.currV = scaleVector(currParticle.currV, dampening);

            //console.log("particle: " + currParticle.currPos)

            this.densities.push(this.calculateDensity(currParticle.currPos));
        }

        // console.log("Particle densities")
        // for (let i = 0; i < this.particles.length; i++) {
        //     console.log(this.particles[i].currPos + " | " + this.densities[i])

        // }


        for (let i = 0; i < this.particles.length; i++) {
            let currParticle = this.particles[i];
            let pressureForce = this.calculatePressureForce(i);
            let deltaV = scaleVector(pressureForce, (dT / this.densities[i]));
            currParticle.currV = addVectors(currParticle.currV, deltaV);

        }



        this.particles.forEach((p) => {
            p.update(dT);
            this.ensureInBounds(p);

        })



        this.setBuffers();
    }

    calculatePressureForce(index) {
        let gradient = [0, 0, 0];
        let samplePoint = this.particles[index].currPos;

        for (let i = 0; i < this.particles.length; i++) {
            let cP = this.particles[i];
            let btw = subtract(cP.currPos, samplePoint);
            let dst = vectorMagnitude(btw);
            if (dst == 0) {
                continue;
            }
            let dir = scaleVector(btw, (1 / dst));

            let slope = this.smoothingKernelDerivative(this.smoothingRadius, dst);
            let pressure = this.convertDensityToPressure(this.densities[i]);
            let scale = slope / this.densities[i];

            let contribution = pressure * scale;
            gradient = addVectors(gradient, scaleVector(dir, contribution))

            // if (index == 1) {
            //     console.log("Working on " + i + " | " + cP.currPos);
            //     console.log("Distance btw: " + btw + " | magnitude: " + dst);
            //     console.log("normalized: " + dir + " | slope at dir: " + slope);
            //     console.log("contribution: " + contribution + " | gradient total: " + gradient);
            // }
        }

        return gradient;
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