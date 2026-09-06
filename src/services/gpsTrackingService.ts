export type TrackingStatus = "NOT_STARTED" | "TRACKING_ACTIVE" | "PAUSED" | "COMPLETED"

export interface GpsCoordinate {
  lat: number
  lng: number
  heading?: number
  speedKmh?: number
  lastUpdated: string
}

class GpsTrackingManager {
  private activeWatchers: Map<string, number> = new Map()

  public requestConsentAndStartTracking(
    orderId: string,
    onLocationUpdate: (coords: GpsCoordinate) => void,
    onError: (err: string) => void,
  ): boolean {
    const userConsent = window.confirm(
      "UZHAVAN requests permission to use your device location during this active shipment to provide delivery tracking to authorized participants.",
    )

    if (!userConsent) {
      onError("Tracking permission declined by user.")
      return false
    }

    if (!navigator.geolocation) {
      onError("Geolocation is not supported by your device browser.")
      return false
    }

    // Clear existing watch if any
    this.stopTracking(orderId)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: GpsCoordinate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading || undefined,
          speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : undefined,
          lastUpdated: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        }
        onLocationUpdate(coords)
      },
      (err) => {
        onError(err.message || "GPS position update failed.")
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    )

    this.activeWatchers.set(orderId, watchId)
    return true
  }

  public stopTracking(orderId: string): void {
    const watchId = this.activeWatchers.get(orderId)
    if (watchId !== undefined && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
      this.activeWatchers.delete(orderId)
    }
  }

  public isTrackingActive(orderId: string): boolean {
    return this.activeWatchers.has(orderId)
  }
}

export const gpsTrackingManager = new GpsTrackingManager()
