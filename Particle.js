class Particle {
    constructor(currPos, desiredPos = currPos, initV = [0, 0, 0], initA = [0, 0, 0], transform) {
        // let transformed = mult(transform, [currPos[0], currPos[1], currPos[2], 1]);
        // this.currPos = [transformed[0], transformed[1], transformed[2]];
        this.currPos = currPos;
        this.posPrediction = currPos;
        this.desiredPos = desiredPos;
        this.currV = initV;
        this.a = initA;
    }




    applyForce(f) {
        this.currV = addVectors(this.currV, f);
    }

    updatePosPrediction(dT) {
        let nextV = addVectors(this.currV, scaleVector(this.a, dT));

        this.posPrediction = addVectors(this.currPos, scaleVector(nextV, dT));
    }

    update(dT) {
        this.currV = addVectors(this.currV, scaleVector(this.a, dT));

        this.currPos = addVectors(this.currPos, scaleVector(this.currV, dT));
    }

    getCurrPos() {
        return {
            x: this.currPos[0],
            y: this.currPos[1],
            z: this.currPos[2]
        }
    }

    getDesiredPos() {
        return {
            x: this.desiredPos[0],
            y: this.desiredPos[1],
            z: this.desiredPos[2]
        }
    }


}