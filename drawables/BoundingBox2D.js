class BoundingBox2D {
    constructor(gl, left, right, up, down) {
        this.gl = gl;
        this.left = left;
        this.right = right;
        this.up = up;
        this.down = down;
        
        this.points = [
            left, down, 0,
            left, up, 0,

            left, up, 0,
            right, up, 0,

            right, up, 0,
            right, down, 0,

            right, down, 0,
            left, down, 0,
        ]

        this.colors = [];
        this.color = [0, 0, 0, 1];
        for (let i = 0; i < this.points.length; i += 3) {
            this.colors.push(this.color);
        }

        this.numVertices = this.points.length / 3;
        this.vBuff = loadBuffer(this.gl, new Float32Array(this.points), gl.STATIC_DRAW);
        this.cBuff = loadBuffer(this.gl, new Float32Array(flatten(this.colors)), gl.STATIC_DRAW);
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
        return this.gl.LINES;
    }

    getBuffers() {
        return [this.vBuff, this.cBuff];
    }

    getNumVertices() {
        return this.numVertices;
    }
}