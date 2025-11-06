const audioContext = new (window.AudioContext || window.webkitAudioContext)()

export const playSound = (type) => {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  switch (type) {
    case 'start':
      oscillator.frequency.value = 523 // C5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
      break

    case 'build':
      oscillator.frequency.value = 659 // E5
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
      break

    case 'complete':
      ;[523, 659, 784].forEach((freq, i) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3)
        osc.start(audioContext.currentTime + i * 0.1)
        osc.stop(audioContext.currentTime + i * 0.1 + 0.3)
      })
      break

    case 'success':
      ;[523, 659, 784, 1047].forEach((freq, i) => {
        const osc = audioContext.createOscillator()
        const gain = audioContext.createGain()
        osc.connect(gain)
        gain.connect(audioContext.destination)
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.25, audioContext.currentTime + i * 0.15)
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.15 + 0.4)
        osc.start(audioContext.currentTime + i * 0.15)
        osc.stop(audioContext.currentTime + i * 0.15 + 0.4)
      })
      break

    case 'click':
      oscillator.frequency.value = 800
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
      break

    default:
      break
  }
}
