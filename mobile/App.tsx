import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, ActivityIndicator, Alert, Modal
} from 'react-native'
import { mobileApi, setToken, getToken } from './lib/api'
import './lib/i18n'
import { useTranslation } from 'react-i18next'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'

const FARE_PRESETS = [
  { id: 'short', label: 'Short trip', amount: 80 },
  { id: 'standard', label: 'Standard', amount: 150 },
  { id: 'medium', label: 'Medium', amount: 220 },
  { id: 'long', label: 'Long trip', amount: 300 },
  { id: 'airport', label: 'Airport', amount: 450 },
]

type Screen = 'home' | 'auth' | 'pay' | 'driver-dashboard' | 'driver-register'
type UserRole = 'PASSENGER' | 'DRIVER' | 'ADMIN'
type User = { id: string; phone: string; role: UserRole }

// ---- QR Scanner Modal ----
function QrScannerModal({ onScan, onClose }: { onScan: (taxiId: string) => void; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (!permission?.granted) requestPermission()
  }, [])

  const handleBarcode = (result: BarcodeScanningResult) => {
    if (scanned) return
    setScanned(true)
    const raw = result.data
    // Parse https://paytaxi.et/t/{taxiId} — extract the taxiId segment
    const match = raw.match(/\/t\/([^/?#]+)/)
    if (match) {
      onScan(match[1])
      onClose()
    } else {
      Alert.alert('Invalid QR', 'This QR code is not a PayTaxi code.', [
        { text: 'Try Again', onPress: () => setScanned(false) }
      ])
    }
  }

  if (!permission) return null
  if (!permission.granted) {
    return (
      <Modal transparent animationType="slide">
        <View style={styles.scannerOverlay}>
          <Text style={styles.scannerText}>Camera permission required</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={onClose}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    )
  }

  return (
    <Modal animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcode}
        />
        <View style={styles.scannerHUD}>
          <Text style={styles.scannerText}>Point at a PayTaxi QR code</Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={onClose}>
            <Text>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ---- OTP Auth Screen ----
function AuthScreen({ role, onSuccess, onBack }: { role: UserRole; onSuccess: (u: User) => void; onBack: () => void }) {
  const { t } = useTranslation()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestOtp = async () => {
    setLoading(true); setError('')
    try {
      const data = await mobileApi.auth.requestOtp(phone, role)
      setChallengeId(data.challengeId)
      setDevCode(data.code)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    if (!challengeId) return
    setLoading(true); setError('')
    try {
      const data = await mobileApi.auth.verifyOtp(challengeId, code)
      await setToken(data.token)
      onSuccess(data.user as User)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>{t('auth.back')}</Text></TouchableOpacity>
        <Text style={styles.h1}>{role === 'DRIVER' ? t('auth.title_driver') : t('auth.title_passenger')}</Text>
        <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        {!challengeId ? (
          <>
            <Text style={styles.label}>{t('auth.phone_label')}</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder={t('auth.phone_placeholder')} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.btn} onPress={requestOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.send_otp')}</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {devCode && <View style={styles.devBox}><Text style={styles.devText}>{t('auth.dev_otp')} {devCode}</Text></View>}
            <Text style={styles.label}>{t('auth.otp_label')}</Text>
            <TextInput style={[styles.input, styles.mono]} value={code} onChangeText={setCode} keyboardType="numeric" maxLength={6} />
            <TouchableOpacity style={styles.btn} onPress={verifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('auth.verify')}</Text>}
            </TouchableOpacity>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  )
}

// ---- Passenger Pay Screen (with QR scanner) ----
function PayScreen({ user, onBack }: { user: User | null; onBack: () => void }) {
  const { t } = useTranslation()
  const [taxiId, setTaxiId] = useState('TX-1001')
  const [fareId, setFareId] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  const pay = async () => {
    setLoading(true); setError(''); setResult('')
    try {
      const data = await mobileApi.payments.initiate(taxiId, fareId)
      setResult(`Transaction ${data.transactionId} created · ${data.fare.amount} ETB`)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={onBack}><Text style={styles.back}>{t('auth.back')}</Text></TouchableOpacity>
        <Text style={styles.h1}>{t('payment.title')}</Text>
        <Text style={styles.label}>{t('payment.taxi_id_label')}</Text>
        <View style={styles.rowBetween}>
          <TextInput
            style={[styles.input, styles.mono, { flex: 1, marginRight: 8, marginBottom: 0 }]}
            value={taxiId}
            onChangeText={setTaxiId}
            autoCapitalize="characters"
          />
          <TouchableOpacity
            style={[styles.btn, { marginBottom: 0, paddingHorizontal: 16 }]}
            onPress={() => setScannerOpen(true)}
          >
            <Text style={styles.btnText}>📷 Scan</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.label, { marginTop: 16 }]}>{t('payment.fare_label')}</Text>
        {FARE_PRESETS.map(f => (
          <TouchableOpacity key={f.id} style={[styles.fareBtn, fareId === f.id && styles.fareBtnActive]} onPress={() => setFareId(f.id)}>
            <Text style={styles.fareLabel}>{f.label}</Text>
            <Text style={styles.fareAmount}>{f.amount} ETB</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.btn} onPress={pay} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t('payment.continue_btn')}</Text>}
        </TouchableOpacity>
        {result ? <View style={styles.successBox}><Text style={styles.successText}>{result}</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      {scannerOpen && (
        <QrScannerModal
          onScan={(id) => setTaxiId(id)}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </SafeAreaView>
  )
}

// ---- Driver Dashboard Screen ----
function DriverDashboardScreen({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [replacing, setReplacing] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setData(await mobileApi.dashboard.get()) } catch { /* noop */ }
    finally { setLoading(false) }
  }

  React.useEffect(() => { load() }, [])

  const replaceQr = async () => {
    setReplacing(true)
    try { await mobileApi.qr.replace(); await load() } catch (e) { Alert.alert('Error', (e as Error).message) }
    finally { setReplacing(false) }
  }

  if (loading) return <SafeAreaView style={styles.safeArea}><ActivityIndicator style={{ marginTop: 80 }} /></SafeAreaView>

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.rowBetween}>
          <Text style={styles.h1}>{t('dashboard.welcome', { name: data?.driver?.displayName })}</Text>
          <TouchableOpacity onPress={onLogout}><Text style={styles.link}>{t('dashboard.log_out')}</Text></TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{data?.total ?? 0} ETB</Text><Text style={styles.statLabel}>{t('dashboard.earnings')}</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{data?.count ?? 0}</Text><Text style={styles.statLabel}>{t('dashboard.payments')}</Text></View>
          <View style={styles.statCard}><Text style={[styles.statNum, styles.mono]}>{data?.qr?.taxiId ?? '—'}</Text><Text style={styles.statLabel}>{data?.qr?.status ?? t('dashboard.no_qr')}</Text></View>
        </View>
        <View style={styles.row}>
          <TouchableOpacity style={styles.outlineBtn} onPress={replaceQr} disabled={replacing}>
            <Text>{replacing ? t('dashboard.replacing') : t('dashboard.report_lost')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={load}><Text style={styles.btnText}>{t('dashboard.refresh')}</Text></TouchableOpacity>
        </View>
        <Text style={[styles.label, { marginTop: 20 }]}>{t('dashboard.recent_tx')}</Text>
        {data?.transactions?.length ? data.transactions.map((tx: any) => (
          <View key={tx.id} style={styles.txRow}>
            <Text style={styles.mono}>{tx.id.slice(0, 10)}…</Text>
            <Text>{tx.amount} ETB</Text>
            <Text style={styles.badge}>{tx.status}</Text>
          </View>
        )) : <Text style={styles.muted}>{t('dashboard.no_tx')}</Text>}
      </ScrollView>
    </SafeAreaView>
  )
}

// ---- Home Screen ----
function HomeScreen({ setScreen, setRole }: { setScreen: (s: Screen) => void; setRole: (r: UserRole) => void }) {
  const { t, i18n } = useTranslation()
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.brand}>PAYTAXI</Text>
        <Text style={styles.h1}>{t('home.title')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => { setRole('PASSENGER'); setScreen('auth') }}>
          <Text style={styles.btnText}>{t('home.pay_btn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineBtn} onPress={() => { setRole('DRIVER'); setScreen('auth') }}>
          <Text>{t('home.driver_btn')}</Text>
        </TouchableOpacity>
        {/* Language switcher */}
        <View style={[styles.row, { marginTop: 24 }]}>
          <TouchableOpacity onPress={() => i18n.changeLanguage('en')} style={[styles.langBtn, i18n.language === 'en' && styles.langBtnActive]}>
            <Text style={styles.langText}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => i18n.changeLanguage('am')} style={[styles.langBtn, i18n.language === 'am' && styles.langBtnActive]}>
            <Text style={styles.langText}>አማ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

// ---- Root ----
export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [role, setRole] = useState<UserRole>('PASSENGER')
  const [user, setUser] = useState<User | null>(null)

  const onAuth = (u: User) => {
    setUser(u)
    setScreen(u.role === 'DRIVER' ? 'driver-dashboard' : 'pay')
  }

  const logout = async () => { await setToken(null); setUser(null); setScreen('home') }

  if (screen === 'auth') return <AuthScreen role={role} onSuccess={onAuth} onBack={() => setScreen('home')} />
  if (screen === 'pay') return <PayScreen user={user} onBack={() => setScreen('home')} />
  if (screen === 'driver-dashboard') return <DriverDashboardScreen onLogout={logout} />
  return <HomeScreen setScreen={setScreen} setRole={setRole} />
}

const PRIMARY = '#1a6b3c'
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f8f5' },
  container: { padding: 20 },
  brand: { fontFamily: 'monospace', fontWeight: '900', color: PRIMARY, fontSize: 14, letterSpacing: 4, marginBottom: 12 },
  h1: { fontSize: 30, fontWeight: '800', color: '#111', marginBottom: 8, lineHeight: 36 },
  subtitle: { color: '#666', marginBottom: 24, fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff', marginBottom: 16 },
  mono: { fontFamily: 'monospace', letterSpacing: 2 },
  btn: { backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 12, flex: 1 },
  fareBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  fareBtnActive: { borderColor: PRIMARY, backgroundColor: '#e8f5ed' },
  fareLabel: { fontWeight: '600' },
  fareAmount: { color: '#555' },
  error: { color: '#c0392b', marginTop: 8, fontSize: 14 },
  devBox: { backgroundColor: '#e8f5ed', borderRadius: 10, padding: 12, marginBottom: 12 },
  devText: { fontFamily: 'monospace', color: '#1a6b3c' },
  successBox: { backgroundColor: '#e8f5ed', borderRadius: 10, padding: 12, marginTop: 10 },
  successText: { color: '#1a6b3c', fontWeight: '600' },
  back: { color: '#666', marginBottom: 20, fontWeight: '600' },
  link: { color: PRIMARY, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eee' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  badge: { fontWeight: '700', color: PRIMARY, fontSize: 12 },
  muted: { color: '#999', fontStyle: 'italic' },
  scannerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  scannerHUD: { backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, alignItems: 'center' },
  scannerText: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  langBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  langBtnActive: { borderColor: PRIMARY, backgroundColor: '#e8f5ed' },
  langText: { fontWeight: '700', color: '#333' },
})
