import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

// 3D 블록 컴포넌트
function Block({ position, color, label, animateUp = false, onComplete }) {
  const meshRef = useRef()
  const [currentY, setCurrentY] = useState(animateUp ? -10 : position[1])
  const [opacity, setOpacity] = useState(animateUp ? 0 : 1)

  useEffect(() => {
    if (animateUp) {
      let progress = 0
      const interval = setInterval(() => {
        progress += 0.02
        if (progress >= 1) {
          clearInterval(interval)
          setCurrentY(position[1])
          setOpacity(1)
          if (onComplete) onComplete()
        } else {
          setCurrentY(-10 + (position[1] + 10) * progress)
          setOpacity(progress)
        }
      }, 30)
      return () => clearInterval(interval)
    }
  }, [animateUp, position])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005
    }
  })

  return (
    <group position={[position[0], currentY, position[2]]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

// 연결선 컴포넌트
function ConnectionLine({ start, end, color = '#ffffff', animated = false }) {
  const lineRef = useRef()
  const [progress, setProgress] = useState(animated ? 0 : 1)

  useEffect(() => {
    if (animated) {
      let p = 0
      const interval = setInterval(() => {
        p += 0.02
        if (p >= 1) {
          clearInterval(interval)
          setProgress(1)
        } else {
          setProgress(p)
        }
      }, 30)
      return () => clearInterval(interval)
    }
  }, [animated])

  const points = [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ]

  const geometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={color}
        linewidth={2}
        opacity={progress}
        transparent
      />
    </line>
  )
}

// 메인 3D 씬
export default function Infrastructure3D({ showGreen = false }) {
  const [greenVisible, setGreenVisible] = useState(false)

  useEffect(() => {
    if (showGreen) {
      setTimeout(() => setGreenVisible(true), 1000)
    }
  }, [showGreen])

  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 20], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#1a1a2e']} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#667eea" />

      {/* Ground (VPC) */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <boxGeometry args={[20, 0.2, 15]} />
        <meshStandardMaterial
          color="#3B82F6"
          transparent
          opacity={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* ALB */}
      <Block
        position={[0, 2, 5]}
        color="#FF6B6B"
        label="ALB"
      />

      {/* Blue ECS Service */}
      <Block
        position={[-5, 2, 0]}
        color="#3B82F6"
        label="ECS Blue"
      />

      {/* Green ECS Service (animated) */}
      {greenVisible && (
        <Block
          position={[5, 2, 0]}
          color="#4ADE80"
          label="ECS Green"
          animateUp={true}
        />
      )}

      {/* RDS */}
      <Block
        position={[0, 2, -5]}
        color="#527FE4"
        label="RDS"
      />

      {/* Redis */}
      <Block
        position={[7, 1, -5]}
        color="#DC382D"
        label="Redis"
      />

      {/* Connection Lines */}
      <ConnectionLine start={[0, 2, 5]} end={[-5, 2, 0]} color="#3B82F6" />
      <ConnectionLine start={[-5, 2, 0]} end={[0, 2, -5]} color="#527FE4" />
      <ConnectionLine start={[-5, 2, 0]} end={[7, 1, -5]} color="#DC382D" />

      {greenVisible && (
        <>
          <ConnectionLine start={[0, 2, 5]} end={[5, 2, 0]} color="#4ADE80" animated />
          <ConnectionLine start={[5, 2, 0]} end={[0, 2, -5]} color="#527FE4" animated />
          <ConnectionLine start={[5, 2, 0]} end={[7, 1, -5]} color="#DC382D" animated />
        </>
      )}

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={10}
        maxDistance={40}
      />
    </Canvas>
  )
}
