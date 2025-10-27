import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import * as THREE from 'three'
import * as faceMesh from '@mediapipe/face_mesh'

declare const Camera: any // MediaPipe Camera from CDN

// ----------------- Glasses Component -----------------
function Glasses({ faceLandmarks }: { faceLandmarks: any }) {
  const ref = useRef<THREE.Group>(null!)
  const [gltf, setGltf] = useState<any>(null)

  useEffect(() => {
    // Load glasses GLB model from public folder
    new GLTFLoader().load('/assets/sun_glasses_fbx_346kb.glb', (model) => {
      setGltf(model.scene)
    })
  }, [])

  useFrame(() => {
    if (!faceLandmarks || !ref.current) return

    const leftEye = faceLandmarks[33]
    const rightEye = faceLandmarks[263]

    // Midpoint between eyes
    const midX = (leftEye.x + rightEye.x) / 2
    const midY = (leftEye.y + rightEye.y) / 2
    const midZ = (leftEye.z + rightEye.z) / 2

    // Position the glasses
    ref.current.position.set(midX - 0.5, -midY + 0.5, -midZ)
    ref.current.scale.set(0.5, 0.5, 0.5)
    ref.current.lookAt(new THREE.Vector3(0, 0, 0))
  })

  return gltf ? <primitive ref={ref} object={gltf} /> : null
}

// ----------------- Main AR Component -----------------
export default function ARFaceTryOn() {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const [faceLandmarks, setFaceLandmarks] = useState<any>(null)

  // ----------------- MediaPipe FaceMesh -----------------
  useEffect(() => {
    const video = videoRef.current

    const model = new faceMesh.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    })

    model.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })

    model.onResults((results) => {
      if (results.multiFaceLandmarks?.length > 0) {
        setFaceLandmarks(results.multiFaceLandmarks[0])
      }
    })

    // Start camera via MediaPipe Camera Utils
    const camera = new Camera(video, {
      onFrame: async () => await model.send({ image: video }),
      width: 640,
      height: 480
    })
    camera.start()
  }, [])

  // ----------------- Optional WebXR Button -----------------
  const startAR = async () => {
    if (!navigator.xr) return alert('WebXR not supported')
    try {
      const session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor', 'camera-access']
      })
      console.log('WebXR session started', session)
    } catch (err) {
      console.error(err)
      alert('Failed to start AR session: ' + err)
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Front camera feed */}
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // mirror for AR
          zIndex: 0
        }}
        autoPlay
        muted
      />

      {/* 3D Canvas overlay */}
      <Canvas
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[0, 1, 1]} intensity={0.5} />
        <Glasses faceLandmarks={faceLandmarks} />
      </Canvas>

      {/* Optional WebXR button */}
      <button
        onClick={startAR}
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          fontSize: '1rem',
          borderRadius: '5px',
          zIndex: 2
        }}
      >
        Enter AR
      </button>
    </div>
  )
}
