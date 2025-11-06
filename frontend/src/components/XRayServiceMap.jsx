import { useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Line } from '@react-three/drei'
import * as THREE from 'three'

// Service type definitions with colors and shapes
const SERVICE_TYPES = {
  USER: { color: '#8B5CF6', emissive: '#8B5CF6', shape: 'sphere', size: 0.4 },
  ALB: { color: '#EC4899', emissive: '#EC4899', shape: 'box', size: 0.7 },
  ECS_BLUE: { color: '#3B82F6', emissive: '#3B82F6', shape: 'cylinder', size: 0.6 },
  ECS_GREEN: { color: '#10B981', emissive: '#10B981', shape: 'cylinder', size: 0.6 },
  DATABASE: { color: '#F59E0B', emissive: '#F59E0B', shape: 'box', size: 0.5 },
  CACHE: { color: '#EF4444', emissive: '#EF4444', shape: 'octahedron', size: 0.5 },
  NAT: { color: '#6B7280', emissive: '#6B7280', shape: 'sphere', size: 0.3 }
}

function ServiceNode({ position, label, type, responseTime }) {
  const meshRef = useRef()
  const config = SERVICE_TYPES[type]

  // Subtle pulsing animation
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.05 + 1
      meshRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  // Get geometry based on service type
  const geometry = useMemo(() => {
    switch (config.shape) {
      case 'box':
        return <boxGeometry args={[config.size, config.size, config.size]} />
      case 'cylinder':
        return <cylinderGeometry args={[config.size * 0.6, config.size * 0.6, config.size * 1.2, 32]} />
      case 'octahedron':
        return <octahedronGeometry args={[config.size, 0]} />
      default:
        return <sphereGeometry args={[config.size, 32, 32]} />
    }
  }, [config])

  // Status color based on response time
  const getStatusColor = () => {
    if (responseTime === 0) return config.color
    if (responseTime < 50) return '#10B981' // Excellent - Green
    if (responseTime < 200) return '#3B82F6' // Good - Blue
    if (responseTime < 500) return '#F59E0B' // Warning - Orange
    return '#EF4444' // Critical - Red
  }

  return (
    <group position={position}>
      {/* Main node */}
      <mesh ref={meshRef}>
        {geometry}
        <meshStandardMaterial
          color={config.color}
          emissive={config.emissive}
          emissiveIntensity={0.4}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Outer glow ring for active services */}
      {responseTime > 0 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[config.size * 1.3, config.size * 1.5, 32]} />
          <meshBasicMaterial
            color={getStatusColor()}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Service label */}
      <Text
        position={[0, config.size + 0.5, 0]}
        fontSize={0.25}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {label}
      </Text>

      {/* Response time indicator */}
      {responseTime > 0 && (
        <Text
          position={[0, -(config.size + 0.4), 0]}
          fontSize={0.18}
          color={getStatusColor()}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          {responseTime}ms
        </Text>
      )}
    </group>
  )
}

function ConnectionLine({ start, end, color = '#667eea', opacity = 0.4 }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end])

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={opacity}
      dashed={false}
    />
  )
}

function DataFlow({ start, end, active = true, color = '#667eea' }) {
  const groupRef = useRef()

  useFrame((state) => {
    if (groupRef.current && active) {
      groupRef.current.children.forEach((particle, i) => {
        const progress = (state.clock.elapsedTime * 0.6 + i * 0.25) % 1
        const x = start[0] + (end[0] - start[0]) * progress
        const y = start[1] + (end[1] - start[1]) * progress
        const z = start[2] + (end[2] - start[2]) * progress
        particle.position.set(x, y, z)

        // Fade in/out effect
        const opacity = Math.sin(progress * Math.PI) * 0.8
        particle.material.opacity = opacity
      })
    }
  })

  return (
    <>
      {/* Static connection line */}
      <ConnectionLine start={start} end={end} color={color} opacity={0.3} />

      {/* Animated particles */}
      <group ref={groupRef}>
        {[...Array(3)].map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </>
  )
}

export default function XRayServiceMap({ services = [], showGreen = true }) {
  // Enhanced AWS architecture service map with types
  const defaultServices = [
    // Entry point
    { name: 'User', type: 'USER', position: [-6, 3, 6], responseTime: 0 },
    { name: 'ALB', type: 'ALB', position: [0, 3, 5], responseTime: 12 },

    // Blue Environment (AZ1 + AZ2)
    { name: 'Blue-AZ1', type: 'ECS_BLUE', position: [-4, 2, 2], responseTime: 245 },
    { name: 'Blue-AZ2', type: 'ECS_BLUE', position: [-4, 2, -2], responseTime: 248 },

    // Green Environment (AZ1 + AZ2) - only if showGreen
    ...(showGreen ? [
      { name: 'Green-AZ1', type: 'ECS_GREEN', position: [4, 2, 2], responseTime: 188 },
      { name: 'Green-AZ2', type: 'ECS_GREEN', position: [4, 2, -2], responseTime: 192 }
    ] : []),

    // Shared services
    { name: 'DynamoDB', type: 'DATABASE', position: [0, 1, -4], responseTime: 18 },
    { name: 'Redis-AZ1', type: 'CACHE', position: [-2, 0.5, 0], responseTime: 3 },
    { name: 'Redis-AZ2', type: 'CACHE', position: [2, 0.5, 0], responseTime: 4 },

    // NAT Gateways (less prominent)
    { name: 'NAT-AZ1', type: 'NAT', position: [-5, 0, 4], responseTime: 2 },
    { name: 'NAT-AZ2', type: 'NAT', position: [5, 0, 4], responseTime: 2 }
  ]

  const serviceData = services.length > 0 ? services : defaultServices

  // Connection color mapping
  const getConnectionColor = (from, to) => {
    if (from.includes('User') || from.includes('ALB')) return '#EC4899' // Pink for entry
    if (from.includes('Blue')) return '#3B82F6' // Blue for blue env
    if (from.includes('Green')) return '#10B981' // Green for green env
    return '#667eea' // Default purple
  }

  return (
    <Canvas
      camera={{ position: [0, 6, 12], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#0a0a15']} />

      {/* Enhanced lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, 5, 5]} intensity={0.6} color="#8B5CF6" />
      <pointLight position={[0, -5, -5]} intensity={0.4} color="#EC4899" />
      <hemisphereLight intensity={0.3} groundColor="#1e1e2e" />

      {/* AZ Background Groups - Visual organization */}
      {/* AZ1 Group */}
      <mesh position={[-3, 1.5, 1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 3.5, 3]} />
        <meshBasicMaterial
          color="#1e3a8a"
          transparent
          opacity={0.05}
          wireframe={false}
        />
      </mesh>

      {/* AZ2 Group */}
      <mesh position={[3, 1.5, -1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 3.5, 3]} />
        <meshBasicMaterial
          color="#166534"
          transparent
          opacity={0.05}
          wireframe={false}
        />
      </mesh>

      {/* Service Nodes */}
      {serviceData.map((service, index) => (
        <ServiceNode
          key={index}
          position={service.position}
          label={service.name}
          type={service.type}
          responseTime={service.responseTime}
        />
      ))}

      {/* Data Flows with color coding */}
      {/* User to ALB */}
      <DataFlow start={[-6, 3, 6]} end={[0, 3, 5]} active={true} color="#8B5CF6" />

      {/* ALB to Blue Environment */}
      <DataFlow start={[0, 3, 5]} end={[-4, 2, 2]} active={true} color="#3B82F6" />
      <DataFlow start={[0, 3, 5]} end={[-4, 2, -2]} active={true} color="#3B82F6" />

      {/* ALB to Green Environment (if exists) */}
      {showGreen && (
        <>
          <DataFlow start={[0, 3, 5]} end={[4, 2, 2]} active={true} color="#10B981" />
          <DataFlow start={[0, 3, 5]} end={[4, 2, -2]} active={true} color="#10B981" />
        </>
      )}

      {/* Blue to DynamoDB */}
      <DataFlow start={[-4, 2, 2]} end={[0, 1, -4]} active={true} color="#3B82F6" />
      <DataFlow start={[-4, 2, -2]} end={[0, 1, -4]} active={true} color="#3B82F6" />

      {/* Green to DynamoDB */}
      {showGreen && (
        <>
          <DataFlow start={[4, 2, 2]} end={[0, 1, -4]} active={true} color="#10B981" />
          <DataFlow start={[4, 2, -2]} end={[0, 1, -4]} active={true} color="#10B981" />
        </>
      )}

      {/* Blue to Redis */}
      <DataFlow start={[-4, 2, 2]} end={[-2, 0.5, 0]} active={true} color="#3B82F6" />
      <DataFlow start={[-4, 2, -2]} end={[2, 0.5, 0]} active={true} color="#3B82F6" />

      {/* Green to Redis */}
      {showGreen && (
        <>
          <DataFlow start={[4, 2, 2]} end={[-2, 0.5, 0]} active={true} color="#10B981" />
          <DataFlow start={[4, 2, -2]} end={[2, 0.5, 0]} active={true} color="#10B981" />
        </>
      )}
    </Canvas>
  )
}
