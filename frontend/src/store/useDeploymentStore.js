import { create } from 'zustand'

const useDeploymentStore = create((set) => ({
  // Current screen
  currentScreen: 'start', // 'start', 'infrastructure', 'traffic', 'success'

  // Deployment state
  isDeploying: false,
  deployProgress: 0,
  elapsedTime: 0,

  // Environment metrics
  blueMetrics: {
    cpu: 45,
    memory: 62,
    responseTime: 245,
    errorRate: 0.1,
    traffic: 100
  },
  greenMetrics: {
    cpu: 0,
    memory: 0,
    responseTime: 0,
    errorRate: 0,
    traffic: 0
  },

  // Terraform resources
  terraformResources: [],

  // Logs
  logs: [],

  // WebSocket connection
  wsConnected: false,

  // Actions
  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  setDeployProgress: (progress) => set((state) => ({
    deployProgress: typeof progress === 'function' ? progress(state.deployProgress) : progress
  })),

  setElapsedTime: (time) => set({ elapsedTime: time }),

  updateBlueMetrics: (metrics) => set((state) => ({
    blueMetrics: { ...state.blueMetrics, ...metrics }
  })),

  updateGreenMetrics: (metrics) => set((state) => ({
    greenMetrics: { ...state.greenMetrics, ...metrics }
  })),

  addTerraformResource: (resource) => set((state) => ({
    terraformResources: [...state.terraformResources, resource]
  })),

  addLog: (log) => set((state) => ({
    logs: [...state.logs.slice(-50), log] // Keep last 50 logs
  })),

  setWsConnected: (connected) => set({ wsConnected: connected }),

  // Start deployment
  startDeployment: () => set({ isDeploying: true, deployProgress: 0 }),

  // Complete deployment
  completeDeployment: () => set({ isDeploying: false, deployProgress: 100 }),
}))

export default useDeploymentStore
