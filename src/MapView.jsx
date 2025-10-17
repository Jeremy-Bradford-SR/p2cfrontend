import React, { useMemo, forwardRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Configure Leaflet icon URLs (avoid bundling images)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

const icons = {
  cadHandler: new L.Icon({iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', iconSize:[25,41], iconAnchor:[12,41]}),
  DailyBulletinArrests: new L.Icon({iconUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-red.png', iconSize:[25,41], iconAnchor:[12,41]})
}

function FitBounds({points}){
  const map = useMap()
  const valid = points.filter(p=>p && typeof p.lat === 'number' && typeof p.lng === 'number')
  if(valid.length===0) return null
  const bounds = L.latLngBounds(valid.map(p=>[p.lat, p.lng]))
  map.fitBounds(bounds, {padding:[50,50]})
  return null
}

function haversineKm(lat1,lon1,lat2,lon2){
  const R = 6371
  const toRad = v=> v * Math.PI / 180
  const dLat = toRad(lat2-lat1)
  const dLon = toRad(lon2-lon1)
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const DEFAULT_CENTER = [42.5006, -90.6646] // Dubuque, IA
const MAX_BOUNDS = [[DEFAULT_CENTER[0]-0.3, DEFAULT_CENTER[1]-0.5],[DEFAULT_CENTER[0]+0.3, DEFAULT_CENTER[1]+0.5]]

export default forwardRef(function MapView({points = [], center, distanceKm, zoomTo}, ref){
  const markers = useMemo(()=>{
    return (points || []).map(row=>{
      // prefer lat/lon fields, then geox/geoy
      const latRaw = row.lat ?? row.Lat
      const lonRaw = row.lon ?? row.Lon
      const geox = row.geox ?? row.Geox ?? row['geox']
      const geoy = row.geoy ?? row.Geoy ?? row['geoy']

      if(latRaw != null && lonRaw != null){
        const lat = Number(latRaw), lng = Number(lonRaw)
        if(Number.isFinite(lat) && Number.isFinite(lng)){
          if(center && distanceKm){
            if(haversineKm(center[0], center[1], lat, lng) > distanceKm) return null
          }
          return {lat, lng, row, source: row._source || row.source || 'unknown'}
        }
      }

      if(geox != null && geoy != null){
        const lat = Number(geoy), lng = Number(geox)
        if(Number.isFinite(lat) && Number.isFinite(lng)){
          if(center && distanceKm){
            if(haversineKm(center[0], center[1], lat, lng) > distanceKm) return null
          }
          return {lat, lng, row, source: row._source || row.source || 'cadHandler'}
        }
      }

      return null
    }).filter(Boolean)
  },[points, center, distanceKm])

  const mapCenter = (center && center.length===2) ? center : DEFAULT_CENTER

  return (
    <MapContainer center={mapCenter} zoom={12} minZoom={11} maxZoom={18} maxBounds={MAX_BOUNDS} whenCreated={m=>{ if(ref) ref.current = m }} style={{height:'100%', width:'100%'}}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {/* draw tools removed to avoid react-leaflet-draw dependency; add back if using compatible package */}
      <FitBounds points={markers} />
      <MarkerClusterGroup>
        {markers.map((m, idx) => (
          <Marker
            key={idx}
            position={[m.lat, m.lng]}
            icon={icons[m.source] || icons.cadHandler}
            eventHandlers={{
              click: ()=> { if(zoomTo) zoomTo([m.lat, m.lng]) },
              mouseover: (e) => { try { e.target.openPopup() } catch(_){} },
              mouseout: (e) => { try { e.target.closePopup() } catch(_){} }
            }}
          >
            <Popup>
              <div style={{minWidth:200}}>
                <div style={{fontWeight:600, marginBottom:6}}>{m.row?.nature || m.row?.event || m.source}</div>
                <div style={{fontSize:13, color:'#333'}}>{m.row?.summary || m.row?.description || m.row?.charge || m.row?.location || ''}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  )
})
