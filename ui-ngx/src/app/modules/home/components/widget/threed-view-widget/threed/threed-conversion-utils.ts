import * as CANNON from 'cannon-es'
import * as THREE from 'three'

/**
 * Converts a cannon.js shape to a three.js geometry
 * ⚠️ Warning: it will not work if the shape has been rotated
 * or scaled beforehand, for example with ConvexPolyhedron.transformAllPoints().
 * @param {Shape} shape The cannon.js shape
 * @param {Object} options The options of the conversion
 * @return {Geometry} The three.js geometry
 */
export function shapeToGeometry(shape, { flatShading = true } = {}) {
  switch (shape.type) {
    case CANNON.Shape.types.SPHERE: {
      return new THREE.SphereGeometry(shape.radius, 8, 8)
    }

    case CANNON.Shape.types.PARTICLE: {
      return new THREE.SphereGeometry(0.1, 8, 8)
    }

    case CANNON.Shape.types.PLANE: {
      return new THREE.PlaneGeometry(500, 500, 4, 4)
    }

    case CANNON.Shape.types.BOX: {
      return new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2)
    }

    case CANNON.Shape.types.CYLINDER: {
      return new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.height, shape.numSegments)
    }

    case CANNON.Shape.types.CONVEXPOLYHEDRON: {
      const geometry = new THREE.BufferGeometry()
      
      // Add vertices
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < shape.vertices.length; i++) {
        const vertex = shape.vertices[i]
        points.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z))
      }
      geometry.setFromPoints(points);

      // Add faces
      for (let i = 0; i < shape.faces.length; i++) {
        const face = shape.faces[i]

        const a = face[0]
        for (let j = 1; j < face.length - 1; j++) {
          const b = face[j]
          const c = face[j + 1]
          geometry.addGroup(a, b, c);
        }
      }

      geometry.computeBoundingSphere()

      if (flatShading) {
        //geometry.computeFaceNormals()
      } else {
        geometry.computeVertexNormals()
      }

      return geometry
    }

    case CANNON.Shape.types.HEIGHTFIELD: {
      const geometry = new THREE.BufferGeometry()

      const v0 = new CANNON.Vec3()
      const v1 = new CANNON.Vec3()
      const v2 = new CANNON.Vec3()
      const points: THREE.Vector3[] = [];
      for (let xi = 0; xi < shape.data.length - 1; xi++) {
        for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
          for (let k = 0; k < 2; k++) {
            shape.getConvexTrianglePillar(xi, yi, k === 0)
            v0.copy(shape.pillarConvex.vertices[0])
            v1.copy(shape.pillarConvex.vertices[1])
            v2.copy(shape.pillarConvex.vertices[2])
            v0.vadd(shape.pillarOffset, v0)
            v1.vadd(shape.pillarOffset, v1)
            v2.vadd(shape.pillarOffset, v2)
            points.push(
              new THREE.Vector3(v0.x, v0.y, v0.z),
              new THREE.Vector3(v1.x, v1.y, v1.z),
              new THREE.Vector3(v2.x, v2.y, v2.z)
            )
            const i = points.length - 3;
            geometry.addGroup(i, i + 1, i + 2);
          }
        }
      }
      geometry.setFromPoints(points);

      geometry.computeBoundingSphere()

      if (flatShading) {
        //geometry.computeFaceNormals()
      } else {
        geometry.computeVertexNormals()
      }

      return geometry
    }

    case CANNON.Shape.types.TRIMESH: {
      const geometry = new THREE.BufferGeometry()

      const v0 = new CANNON.Vec3()
      const v1 = new CANNON.Vec3()
      const v2 = new CANNON.Vec3()
      const points: THREE.Vector3[] = [];
      for (let i = 0; i < shape.indices.length / 3; i++) {
        shape.getTriangleVertices(i, v0, v1, v2)
        points.push(
          new THREE.Vector3(v0.x, v0.y, v0.z),
          new THREE.Vector3(v1.x, v1.y, v1.z),
          new THREE.Vector3(v2.x, v2.y, v2.z)
        )
        const j = points.length - 3
        geometry.addGroup(j, j + 1, j + 2)
      }
      geometry.setFromPoints(points);

      geometry.computeBoundingSphere()

      if (flatShading) {
        //geometry.computeFaceNormals()
      } else {
        geometry.computeVertexNormals()
      }

      return geometry
    }

    default: {
      throw new Error(`Shape not recognized: "${shape.type}"`)
    }
  }
}

/**
 * Converts a cannon.js body to a three.js mesh group
 * @param {Body} body The cannon.js body
 * @param {Material} material The material the mesh will have
 * @return {Group} The three.js mesh group
 */
export function bodyToMesh(body, material) {
  const group = new THREE.Group()

  group.position.copy(body.position)
  group.quaternion.copy(body.quaternion)

  const meshes = body.shapes.map((shape) => {
    const geometry = shapeToGeometry(shape)

    return new THREE.Mesh(geometry, material)
  })

  meshes.forEach((mesh, i) => {
    const offset = body.shapeOffsets[i]
    const orientation = body.shapeOrientations[i]
    mesh.position.copy(offset)
    mesh.quaternion.copy(orientation)

    group.add(mesh)
  })

  return group
}