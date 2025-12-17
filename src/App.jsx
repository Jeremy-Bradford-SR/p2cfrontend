import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { Tabs, Tab } from './Tabs'
import CrimeTimeReplay from './CrimeTimeReplay'



import DataScience from './DataScience'
import api, { getIncidents, getSexOffenders, getCorrections, getDispatch, getTraffic, getJailInmates, getJailImage, getOffenderDetail, getOffenderDetailByName, getJailByName, getArrestsByName, getTrafficByName, getCrimeByName, search360 } from './client'
import DataGrid from './DataGrid' // 1. IMPORT DATAGRID
import MapWithData from './MapWithData' // 1. IMPORT MapWithData
import SplitView from './SplitView'
import FilterableDataGrid from './FilterableDataGrid'
import Tab720 from './P2CTab'

import RecordsTab from './RecordsTab'
import MobileApp from './MobileApp' // Import Mobile App
import useIsMobile from './hooks/useIsMobile' // Import Detection Hook

// Simple Modal Component for Jail Inmates
const JailModal = ({ inmate, onClose }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    async function fetchImage() {
      if (!inmate?.book_id) return;
      try {
        const res = await getJailImage(inmate.book_id);
        if (mounted && res?.response?.data?.data?.[0]?.photo_data) {
          // Assuming photo_data is base64 string or we need to handle it.
          // If it's raw bytes from SQL, the API usually returns it as a base64 string in JSON.
          // Let's assume base64.
          setImageUrl(`data:image/jpeg;base64,${res.response.data.data[0].photo_data}`);
        }
      } catch (e) {
        console.error("Failed to fetch jail image", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchImage();
    return () => { mounted = false; };
  }, [inmate]);

  if (!inmate) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '90%',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>

        <h2 style={{ marginTop: 0 }}>{inmate.lastname}, {inmate.firstname}</h2>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: '200px', alignItems: 'center', background: '#f0f0f0' }}>
          {loading ? <span>Loading photo...</span> : (
            imageUrl ?
              <img src={imageUrl} alt={`${inmate.lastname}`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} /> :
              <span>No Photo Available</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
          <div><strong>Age:</strong> {inmate.age}</div>
          <div><strong>Sex:</strong> {inmate.sex}</div>
          <div><strong>Race:</strong> {inmate.race}</div>
          <div><strong>Booked:</strong> {new Date(inmate.arrest_date).toLocaleDateString()}</div>
          <div><strong>Bond:</strong> {inmate.total_bond_amount}</div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <strong>Charges:</strong>
          <p style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
            {inmate.charges || 'No charges listed'}
          </p>
        </div>
      </div>
    </div>
  );
};
// Simple Modal Component for Sex Offenders
const SexOffenderModal = ({ offender, onClose }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const imageUrl = offender.photo_data
    ? `data:image/jpeg;base64,${offender.photo_data}`
    : offender.photo_url;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '90%',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>

        <h2 style={{ marginTop: 0 }}>{offender.last_name}, {offender.first_name} {offender.middle_name}</h2>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0', minHeight: '200px', alignItems: 'center', background: '#f0f0f0' }}>
          {imageUrl ?
            <img src={imageUrl} alt={`${offender.last_name}`} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }} /> :
            <span>No Photo Available</span>
          }
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
          <div><strong>Tier:</strong> {offender.tier}</div>
          <div><strong>Address:</strong> {offender.address_line_1}</div>
          <div><strong>City:</strong> {offender.city}</div>
          <div><strong>Registrant ID:</strong> {offender.registrant_id}</div>
        </div>
      </div>
    </div>
  );
};

// Modal Component for Probation/Parole Offenders
const OffenderModal = ({ offenderNumber, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [offender, setOffender] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    let mounted = true;
    async function fetchDetails() {
      if (!offenderNumber) return;
      try {
        const res = await getOffenderDetail(offenderNumber);
        if (mounted && res.success) {
          setOffender(res.response);
        }
      } catch (e) {
        console.error("Failed to fetch offender details", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchDetails();
    return () => { mounted = false; };
  }, [offenderNumber]);

  if (!offenderNumber) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white', padding: '0', borderRadius: '12px', maxWidth: '700px', width: '90%',
        maxHeight: '85vh', overflow: 'hidden', position: 'relative'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
          padding: '20px 24px',
          color: 'white'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '15px', right: '15px',
            border: 'none', background: 'rgba(255,255,255,0.2)',
            fontSize: '18px', cursor: 'pointer', color: 'white',
            width: '30px', height: '30px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>

          <h2 style={{ margin: 0, fontSize: '20px' }}>
            {loading ? 'Loading...' : offender?.summary?.Name || 'Offender Record'}
          </h2>
          {!loading && offender?.summary && (
            <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '13px' }}>
              ID: {offender.summary.OffenderNumber} • {offender.summary.Gender === 'M' ? 'Male' : offender.summary.Gender === 'F' ? 'Female' : offender.summary.Gender} • Age: {offender.summary.Age}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: 'calc(85vh - 80px)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              ⏳ Loading offender details...
            </div>
          ) : offender ? (
            <>
              {/* Case Details */}
              {offender.detail && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '12px', borderLeft: '3px solid #2563eb', paddingLeft: '10px' }}>
                    Case Details
                  </h3>
                  <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div><strong>Location:</strong> {offender.detail.Location || 'N/A'}</div>
                      <div><strong>Offense:</strong> {offender.detail.Offense || 'N/A'}</div>
                      <div><strong>Commitment Date:</strong> {formatDate(offender.detail.CommitmentDate)}</div>
                      <div><strong>TDD/SDD:</strong> {formatDate(offender.detail.TDD_SDD)}</div>
                      <div><strong>Recall Date:</strong> {formatDate(offender.detail.RecallDate)}</div>
                      <div><strong>Decision:</strong> {offender.detail.Decision || 'N/A'}</div>
                      <div><strong>Decision Date:</strong> {formatDate(offender.detail.DecisionDate)}</div>
                      <div><strong>Effective Date:</strong> {formatDate(offender.detail.EffectiveDate)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Charges */}
              {offender.charges && offender.charges.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1f2937', marginBottom: '12px', borderLeft: '3px solid #7c3aed', paddingLeft: '10px' }}>
                    Charges ({offender.charges.length})
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>Offense Class</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>County</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600 }}>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {offender.charges.map((charge, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px' }}>{charge.SupervisionStatus || 'N/A'}</td>
                          <td style={{ padding: '10px' }}>{charge.OffenseClass || 'N/A'}</td>
                          <td style={{ padding: '10px' }}>{charge.CountyOfCommitment || 'N/A'}</td>
                          <td style={{ padding: '10px' }}>{formatDate(charge.EndDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!offender.detail && (!offender.charges || offender.charges.length === 0) && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No additional details available for this offender.
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              No data found for this offender.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Violator Modal - Split View of Arrest Record + Offender Record
const ViolatorModal = ({ violator, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [offenderData, setOffenderData] = useState(null);
  const [jailRecords, setJailRecords] = useState([]);
  const [jailLoading, setJailLoading] = useState(true);
  const [previousArrests, setPreviousArrests] = useState([]);
  const [arrestsLoading, setArrestsLoading] = useState(true);

  // Parse name helper
  const parseName = (fullName) => {
    if (!fullName) return { firstName: '', lastName: '' };
    const nameParts = fullName.split(/[,\s]+/).filter(p => p.length > 0);
    let firstName = '', lastName = '';
    if (fullName.includes(',')) {
      lastName = nameParts[0] || '';
      firstName = nameParts[1] || '';
    } else {
      firstName = nameParts[0] || '';
      lastName = nameParts[nameParts.length - 1] || '';
    }
    return { firstName, lastName };
  };

  useEffect(() => {
    let mounted = true;
    const { firstName, lastName } = parseName(violator?.ArrestRecordName);

    async function fetchOffenderDetails() {
      if (!violator?.OffenderNumbers) {
        setLoading(false);
        return;
      }
      try {
        const offenderNum = String(violator.OffenderNumbers).split(',')[0].trim();
        if (offenderNum) {
          const res = await getOffenderDetail(offenderNum);
          if (mounted && res.success) {
            setOffenderData(res.response);
          }
        }
      } catch (e) {
        console.error("Failed to fetch offender details", e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchJailRecords() {
      if (!firstName && !lastName) {
        setJailLoading(false);
        return;
      }
      try {
        const res = await getJailByName(firstName, lastName);
        if (mounted && res.success && res.response?.data?.data) {
          setJailRecords(res.response.data.data || []);
        }
      } catch (e) {
        console.error("Failed to fetch jail records", e);
      } finally {
        if (mounted) setJailLoading(false);
      }
    }

    async function fetchPreviousArrests() {
      if (!firstName && !lastName) {
        setArrestsLoading(false);
        return;
      }
      try {
        const res = await getArrestsByName(firstName, lastName);
        if (mounted && res.success && res.response?.data?.data) {
          const all = res.response.data.data || [];
          const currentTime = violator.event_time ? new Date(violator.event_time).getTime() : null;
          const filtered = currentTime
            ? all.filter(a => Math.abs(new Date(a.event_time).getTime() - currentTime) > 60000)
            : all;
          setPreviousArrests(filtered);
        }
      } catch (e) {
        console.error("Failed to fetch previous arrests", e);
      } finally {
        if (mounted) setArrestsLoading(false);
      }
    }

    fetchOffenderDetails();
    fetchJailRecords();
    fetchPreviousArrests();

    return () => { mounted = false; };
  }, [violator]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!violator) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  };


  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'white', padding: '0', borderRadius: '12px', maxWidth: '1400px', width: '98%',
        maxHeight: '88vh', overflow: 'hidden', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          padding: '18px 28px',
          color: 'white'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: '10px', right: '15px',
            border: 'none', background: 'rgba(255,255,255,0.2)',
            fontSize: '18px', cursor: 'pointer', color: 'white',
            width: '28px', height: '28px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>

          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>
            ⚠️ Repeat Offender: {violator.ArrestRecordName || 'Unknown'}
          </h2>
          <p style={{ margin: '5px 0 0', opacity: 0.9, fontSize: '14px' }}>
            Offender #: {violator.OffenderNumbers || 'N/A'}
          </p>
        </div>

        {/* 3-Column Body */}
        <div style={{ display: 'flex', height: 'calc(88vh - 80px)', overflow: 'hidden' }}>

          {/* Column 1: Arrests (Recent + Previous) */}
          <div style={{ flex: 1, borderRight: '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>

              {/* Recent Arrest */}
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#dc2626', marginBottom: '14px', borderLeft: '4px solid #dc2626', paddingLeft: '12px', margin: '0 0 14px 0' }}>
                🚔 Recent Arrest
              </h3>
              <div style={{ background: '#fef2f2', borderRadius: '8px', padding: '16px', fontSize: '14px', marginBottom: '16px', border: '1px solid #fecaca' }}>
                <div style={{ marginBottom: '10px' }}>
                  <strong style={{ color: '#374151' }}>Charge:</strong> <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '15px' }}>{violator.ArrestCharge || 'N/A'}</span>
                </div>
                <div style={{ marginBottom: '10px', color: '#374151' }}><strong>Date:</strong> {formatDateTime(violator.event_time)}</div>
                <div style={{ color: '#374151' }}><strong>Location:</strong> {violator.location || 'N/A'}</div>
              </div>

              {violator.OriginalOffenses && (
                <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#475569', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#334155' }}>Prior Offenses (DOC):</strong> {violator.OriginalOffenses}
                </div>
              )}

              {/* Previous Arrests */}
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ea580c', marginBottom: '14px', borderLeft: '4px solid #ea580c', paddingLeft: '12px', margin: '0 0 14px 0' }}>
                📜 Previous Arrests ({previousArrests.length})
              </h3>

              {arrestsLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
                  ⏳ Loading arrest history...
                </div>
              ) : previousArrests.length > 0 ? (
                <div style={{ overflowY: 'auto', maxHeight: '350px' }}>
                  {previousArrests.map((arr, idx) => (
                    <div key={idx} style={{
                      background: '#fff7ed', borderRadius: '8px', padding: '14px', marginBottom: '10px',
                      border: '1px solid #fed7aa', fontSize: '13px'
                    }}>
                      <div style={{ fontWeight: 700, color: '#ea580c', marginBottom: '6px', fontSize: '14px' }}>{arr.charge || 'Unknown Charge'}</div>
                      <div style={{ color: '#374151', marginBottom: '4px' }}><strong>Date:</strong> {formatDateTime(arr.event_time)}</div>
                      <div style={{ color: '#374151' }}><strong>Location:</strong> {arr.location || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#666', background: '#f9fafb', borderRadius: '8px', fontSize: '14px' }}>
                  No previous arrest records found.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: DOC Offender Record */}
          <div style={{ flex: 1, borderRight: '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f9fafb', minWidth: 0 }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a5f', marginBottom: '14px', borderLeft: '4px solid #2563eb', paddingLeft: '12px', margin: '0 0 14px 0' }}>
                📋 DOC Offender Record
              </h3>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
                  ⏳ Loading DOC record...
                </div>
              ) : offenderData ? (
                <>
                  {offenderData.summary && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '14px', marginBottom: '12px', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><strong style={{ color: '#374151' }}>ID:</strong> {offenderData.summary.OffenderNumber}</div>
                        <div><strong style={{ color: '#374151' }}>Name:</strong> {offenderData.summary.Name}</div>
                        <div><strong style={{ color: '#374151' }}>Gender:</strong> {offenderData.summary.Gender === 'M' ? 'Male' : offenderData.summary.Gender === 'F' ? 'Female' : offenderData.summary.Gender}</div>
                        <div><strong style={{ color: '#374151' }}>Age:</strong> {offenderData.summary.Age}</div>
                      </div>
                    </div>
                  )}

                  {offenderData.detail && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '14px', marginBottom: '12px', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Case Details</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><strong style={{ color: '#374151' }}>Location:</strong> {offenderData.detail.Location || 'N/A'}</div>
                        <div><strong style={{ color: '#374151' }}>Offense:</strong> {offenderData.detail.Offense || 'N/A'}</div>
                        <div><strong style={{ color: '#374151' }}>Commitment:</strong> {formatDate(offenderData.detail.CommitmentDate)}</div>
                        <div><strong style={{ color: '#374151' }}>Decision:</strong> {offenderData.detail.Decision || 'N/A'}</div>
                      </div>
                    </div>
                  )}

                  {offenderData.charges && offenderData.charges.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '8px', padding: '14px', fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Charges ({offenderData.charges.length})</h4>
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Status</th>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Class</th>
                              <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>End</th>
                            </tr>
                          </thead>
                          <tbody>
                            {offenderData.charges.map((c, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px' }}>{c.SupervisionStatus || 'N/A'}</td>
                                <td style={{ padding: '8px' }}>{c.OffenseClass || 'N/A'}</td>
                                <td style={{ padding: '8px' }}>{formatDate(c.EndDate)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!offenderData.summary && !offenderData.detail && (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
                      No detailed DOC record found.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
                  No offender record found in DOC database.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Jail Records */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#7c3aed', marginBottom: '14px', borderLeft: '4px solid #7c3aed', paddingLeft: '12px', margin: '0 0 14px 0' }}>
                🔒 Jail Records ({jailRecords.length})
              </h3>

              {jailLoading ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
                  ⏳ Searching jail records...
                </div>
              ) : jailRecords.length > 0 ? (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 40px)' }}>
                  {jailRecords.map((jail, idx) => (
                    <div key={idx} style={{
                      background: '#f5f3ff', borderRadius: '8px', padding: '14px', marginBottom: '10px',
                      border: '1px solid #e9d5ff', fontSize: '13px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#1f2937', fontSize: '15px' }}>
                          {jail.firstname} {jail.lastname}
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280', background: '#e5e7eb', padding: '2px 8px', borderRadius: '4px' }}>
                          #{jail.book_id}
                        </span>
                      </div>
                      <div style={{ color: '#374151', marginBottom: '6px' }}><strong>Booked:</strong> {formatDateTime(jail.arrest_date)}</div>
                      <div style={{ color: '#374151', marginBottom: '6px' }}><strong>Bond:</strong> <span style={{ color: '#059669', fontWeight: 600 }}>{jail.total_bond_amount || 'N/A'}</span></div>
                      {jail.charges && (
                        <div style={{ marginTop: '8px', background: '#ede9fe', padding: '8px', borderRadius: '6px' }}>
                          <strong style={{ color: '#6d28d9' }}>Charges:</strong>
                          <span style={{ color: '#5b21b6', marginLeft: '6px' }}>{jail.charges}</span>
                        </div>
                      )}
                      {jail.released_date && (
                        <div style={{ color: '#059669', marginTop: '8px', fontWeight: 600 }}><strong>Released:</strong> {formatDateTime(jail.released_date)}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#666', background: '#f9fafb', borderRadius: '8px', fontSize: '14px' }}>
                  No matching jail records found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// View360Modal - Comprehensive person view
const View360Modal = ({ record, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [offenderData, setOffenderData] = useState(null);
  const [jailRecords, setJailRecords] = useState([]);
  const [arrests, setArrests] = useState([]);
  const [trafficRecords, setTrafficRecords] = useState([]);
  const [crimeRecords, setCrimeRecords] = useState([]);
  const [dataLoading, setDataLoading] = useState({ jail: true, arrests: true, traffic: true, crime: true, doc: true });

  const parseName = (fullName) => {
    if (!fullName) return { firstName: '', lastName: '' };
    const nameParts = fullName.split(/[,\s]+/).filter(p => p.length > 0);
    if (fullName.includes(',')) {
      return { firstName: nameParts[1] || '', lastName: nameParts[0] || '' };
    }
    return { firstName: nameParts[0] || '', lastName: nameParts[nameParts.length - 1] || '' };
  };

  useEffect(() => {
    if (!record) return;
    let mounted = true;

    // Prioritize explicit fields over parsing composite strings
    let firstName = record.firstname || record.Firstname || '';
    let lastName = record.lastname || record.Lastname || '';

    if (!firstName && !lastName) {
      const name = record.name || record.ArrestRecordName || record.Name || '';
      const parsed = parseName(name);
      firstName = parsed.firstName;
      lastName = parsed.lastName;
    }

    console.log('[View360Modal] Searching for:', { firstName, lastName, record });

    // Fetch all data in parallel
    async function fetchAll() {
      const promises = [];

      // Arrests
      promises.push(
        getArrestsByName(firstName, lastName)
          .then(res => { if (mounted) setArrests(res.response?.data?.data || []); })
          .finally(() => { if (mounted) setDataLoading(p => ({ ...p, arrests: false })); })
      );

      // Traffic
      promises.push(
        getTrafficByName(firstName, lastName)
          .then(res => { if (mounted) setTrafficRecords(res.response?.data?.data || []); })
          .finally(() => { if (mounted) setDataLoading(p => ({ ...p, traffic: false })); })
      );

      // Crime
      promises.push(
        getCrimeByName(firstName, lastName)
          .then(res => { if (mounted) setCrimeRecords(res.response?.data?.data || []); })
          .finally(() => { if (mounted) setDataLoading(p => ({ ...p, crime: false })); })
      );

      // Jail
      promises.push(
        getJailByName(firstName, lastName)
          .then(res => { if (mounted) setJailRecords(res.response?.data?.data || []); })
          .finally(() => { if (mounted) setDataLoading(p => ({ ...p, jail: false })); })
      );

      // DOC (if OffenderNumbers available)
      // DOC (if OffenderNumbers available OR search by Name)
      if (record.OffenderNumbers) {
        const offNum = String(record.OffenderNumbers).split(',')[0].trim();
        promises.push(
          getOffenderDetail(offNum)
            .then(res => { if (mounted && res.success) setOffenderData(res.response); })
            .finally(() => { if (mounted) setDataLoading(p => ({ ...p, doc: false })); })
        );
      } else {
        // Fallback: Search by Name
        promises.push(
          getOffenderDetailByName(firstName, lastName)
            .then(res => { if (mounted && res.success) setOffenderData(res.response); })
            .finally(() => { if (mounted) setDataLoading(p => ({ ...p, doc: false })); })
        );
      }

      await Promise.all(promises);
      if (mounted) setLoading(false);
    }

    fetchAll();
    return () => { mounted = false; };
  }, [record]);

  useEffect(() => {
    const handleEsc = (e) => {
      console.log('[View360Modal] keydown:', e.key);
      if (e.key === 'Escape') {
        console.log('[View360Modal] Closing via Escape');
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!record) return null;

  const formatDateTime = (d) => d ? new Date(d).toLocaleString() : 'N/A';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : 'N/A';
  const name = record.name || record.ArrestRecordName || `${record.firstname || ''} ${record.lastname || ''}`.trim();
  const recType = record._source || record.key || 'Unknown';

  const typeColors = {
    'DailyBulletinArrests': '#dc2626', 'AR': '#dc2626',
    'TrafficCitation': '#ea580c', 'TC': '#ea580c',
    'TrafficAccident': '#d97706', 'TA': '#d97706',
    'Crime': '#7c3aed', 'LW': '#7c3aed',
    'Violator': '#be123c'
  };
  const headerColor = typeColors[recType] || '#1e3a5f';

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', maxWidth: '1500px', width: '98%', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%)`, padding: '16px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>🔍 360° View: {name || 'Unknown'}</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.9, fontSize: '13px' }}>
              Record Type: {recType} | {record.charge || record.ArrestCharge || 'N/A'} | {formatDateTime(record.event_time)}
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.2)', fontSize: '20px', cursor: 'pointer', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* 4-Column Body */}
        <div style={{ display: 'flex', height: 'calc(90vh - 70px)', overflow: 'hidden' }}>

          {/* Column 1: Arrests */}
          <div style={{ flex: 1, borderRight: '2px solid #e5e7eb', overflowY: 'auto', padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626', marginBottom: '12px', borderLeft: '4px solid #dc2626', paddingLeft: '10px', margin: '0 0 12px 0' }}>
              🚔 Arrests ({arrests.length})
            </h3>
            {dataLoading.arrests ? <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>⏳ Loading...</div> :
              arrests.length > 0 ? arrests.map((a, i) => (
                <div key={i} style={{ background: '#fef2f2', borderRadius: '6px', padding: '10px', marginBottom: '8px', fontSize: '13px', border: '1px solid #fecaca' }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>{a.charge}</div>
                  <div><strong>Date:</strong> {formatDateTime(a.event_time)}</div>
                  <div><strong>Location:</strong> {a.location || 'N/A'}</div>
                </div>
              )) : <div style={{ textAlign: 'center', padding: '20px', color: '#666', background: '#f9fafb', borderRadius: '6px' }}>No arrests found</div>
            }
          </div>

          {/* Column 2: Traffic */}
          <div style={{ flex: 1, borderRight: '2px solid #e5e7eb', overflowY: 'auto', padding: '16px', background: '#fffbeb' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ea580c', marginBottom: '12px', borderLeft: '4px solid #ea580c', paddingLeft: '10px', margin: '0 0 12px 0' }}>
              🚗 Traffic ({trafficRecords.length})
            </h3>
            {dataLoading.traffic ? <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>⏳ Loading...</div> :
              trafficRecords.length > 0 ? trafficRecords.map((t, i) => (
                <div key={i} style={{ background: '#fff7ed', borderRadius: '6px', padding: '10px', marginBottom: '8px', fontSize: '13px', border: '1px solid #fed7aa' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#ea580c' }}>{t.charge}</span>
                    <span style={{ fontSize: '11px', background: t.key === 'TC' ? '#fbbf24' : '#f59e0b', color: 'white', padding: '1px 6px', borderRadius: '4px' }}>{t.key === 'TC' ? 'Citation' : 'Accident'}</span>
                  </div>
                  <div><strong>Date:</strong> {formatDateTime(t.event_time)}</div>
                  <div><strong>Location:</strong> {t.location || 'N/A'}</div>
                </div>
              )) : <div style={{ textAlign: 'center', padding: '20px', color: '#666', background: '#f9fafb', borderRadius: '6px' }}>No traffic records</div>
            }
          </div>

          {/* Column 3: Crime Reports */}
          <div style={{ flex: 1, borderRight: '2px solid #e5e7eb', overflowY: 'auto', padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#7c3aed', marginBottom: '12px', borderLeft: '4px solid #7c3aed', paddingLeft: '10px', margin: '0 0 12px 0' }}>
              📋 Crime Reports ({crimeRecords.length})
            </h3>
            {dataLoading.crime ? <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>⏳ Loading...</div> :
              crimeRecords.length > 0 ? crimeRecords.map((c, i) => (
                <div key={i} style={{ background: '#f5f3ff', borderRadius: '6px', padding: '10px', marginBottom: '8px', fontSize: '13px', border: '1px solid #e9d5ff' }}>
                  <div style={{ fontWeight: 600, color: '#7c3aed', marginBottom: '4px' }}>{c.charge}</div>
                  <div><strong>Date:</strong> {formatDateTime(c.event_time)}</div>
                  <div><strong>Location:</strong> {c.location || 'N/A'}</div>
                </div>
              )) : <div style={{ textAlign: 'center', padding: '20px', color: '#666', background: '#f9fafb', borderRadius: '6px' }}>No crime reports</div>
            }
          </div>

          {/* Column 4: DOC + Jail */}
          <div style={{ flex: 1.2, overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
            {/* DOC */}
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af', marginBottom: '12px', borderLeft: '4px solid #2563eb', paddingLeft: '10px', margin: '0 0 12px 0' }}>
              📄 DOC Record
            </h3>
            {dataLoading.doc ? <div style={{ textAlign: 'center', padding: '16px', color: '#666' }}>⏳ Loading...</div> :
              offenderData?.summary ? (
                <div style={{ background: 'white', borderRadius: '6px', padding: '12px', marginBottom: '14px', fontSize: '13px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div><strong>ID:</strong> {offenderData.summary.OffenderNumber}</div>
                    <div><strong>Name:</strong> {offenderData.summary.Name}</div>
                    <div><strong>Age:</strong> {offenderData.summary.Age}</div>
                    <div><strong>Gender:</strong> {offenderData.summary.Gender}</div>
                  </div>
                  {offenderData.charges?.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <strong>Charges:</strong>
                      <div style={{ maxHeight: '100px', overflowY: 'auto', fontSize: '12px', marginTop: '4px' }}>
                        {offenderData.charges.map((ch, i) => (
                          <div key={i} style={{ background: '#f1f5f9', padding: '4px 8px', marginBottom: '3px', borderRadius: '4px' }}>
                            {ch.SupervisionStatus} - {ch.OffenseClass}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : <div style={{ textAlign: 'center', padding: '16px', color: '#666', background: '#f9fafb', borderRadius: '6px', marginBottom: '14px' }}>No DOC record</div>
            }

            {/* Jail */}
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0891b2', marginBottom: '12px', borderLeft: '4px solid #06b6d4', paddingLeft: '10px', margin: '0 0 12px 0' }}>
              🔒 Jail Records ({jailRecords.length})
            </h3>
            {dataLoading.jail ? <div style={{ textAlign: 'center', padding: '16px', color: '#666' }}>⏳ Loading...</div> :
              jailRecords.length > 0 ? jailRecords.map((j, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '6px', padding: '10px', marginBottom: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{j.firstname} {j.lastname}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>#{j.book_id}</span>
                  </div>
                  <div><strong>Booked:</strong> {formatDateTime(j.arrest_date)}</div>
                  <div><strong>Bond:</strong> <span style={{ color: '#059669' }}>{j.total_bond_amount || 'N/A'}</span></div>
                  {j.charges && <div style={{ marginTop: '4px', color: '#0891b2' }}><strong>Charges:</strong> {j.charges}</div>}
                  {j.released_date && <div style={{ color: '#22c55e' }}><strong>Released:</strong> {formatDate(j.released_date)}</div>}
                </div>
              )) : <div style={{ textAlign: 'center', padding: '16px', color: '#666', background: '#f9fafb', borderRadius: '6px' }}>No jail records</div>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

// View360Content - Search-based 360 view (searches entire database)
const View360Content = ({ mapHeight, setMapHeight, onRowClick }) => {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const mapRef = useRef(null);

  // Type styles for each record type
  const typeStyles = {
    'ARREST': { bg: '#fef2f2', border: '#dc2626', badge: '#dc2626', text: '#991b1b', label: '🚔 Arrest' },
    'CRIME': { bg: '#f5f3ff', border: '#7c3aed', badge: '#7c3aed', text: '#5b21b6', label: '📋 Crime' },
    'CITATION': { bg: '#fffbeb', border: '#f59e0b', badge: '#f59e0b', text: '#b45309', label: '🚗 Citation' },
    'ACCIDENT': { bg: '#fff7ed', border: '#ea580c', badge: '#ea580c', text: '#c2410c', label: '💥 Accident' },
    'SEX_OFFENDER': { bg: '#fae8ff', border: '#d946ef', badge: '#d946ef', text: '#86198f', label: '⚠️ Sex Off.' },
    'PROBATION': { bg: '#ffedd5', border: '#f97316', badge: '#f97316', text: '#9a3412', label: '🛑 Probation' },
    'PAROLE': { bg: '#ecfccb', border: '#84cc16', badge: '#84cc16', text: '#3f6212', label: '⚖️ Parole' },
    'DOC': { bg: '#f3f4f6', border: '#6b7280', badge: '#6b7280', text: '#1f2937', label: '🏛️ DOC' }
  };

  const handleSearch = async () => {
    if (!searchText || searchText.trim().length < 2) return;

    setSearching(true);
    setHasSearched(true);

    try {
      const res = await search360(searchText.trim());
      const data = res.response?.data?.data || [];
      setResults(data);
    } catch (e) {
      console.error('360 search failed:', e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const mapPoints = useMemo(() => results.filter(p => p.lat && p.lon), [results]);
  const formatDateTime = (d) => d ? new Date(d).toLocaleString() : 'N/A';

  const zoomToRow = (r) => {
    const lat = r.lat || r.Lat;
    const lon = r.lon || r.Lon;
    if (lat && lon && mapRef.current?.setView) {
      mapRef.current.setView([Number(lat), Number(lon)], 14);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Info Banner */}
      <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)', marginBottom: '12px', borderRadius: '8px', fontSize: '14px', color: 'white' }}>
        🔍 <strong>360° Person Search</strong> - Search by name to see complete history across ALL databases (arrests, traffic, crimes).
      </div>

      {/* Search Controls */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', alignItems: 'center', border: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder="Enter name to search (e.g., Smith, John Smith, etc.)..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ flex: '1', minWidth: '250px', padding: '10px 14px', borderRadius: '6px', border: '2px solid #3b82f6', fontSize: '15px' }}
        />
        <button
          onClick={handleSearch}
          disabled={searching || searchText.trim().length < 2}
          style={{
            padding: '10px 24px', borderRadius: '6px', border: 'none',
            background: searching ? '#9ca3af' : '#3b82f6', color: 'white',
            fontSize: '15px', fontWeight: 600, cursor: searching ? 'wait' : 'pointer'
          }}
        >
          {searching ? '⏳ Searching...' : '🔍 Search Database'}
        </button>
        {results.length > 0 && (
          <span style={{ fontSize: '13px', color: '#059669', background: '#d1fae5', padding: '6px 12px', borderRadius: '6px', fontWeight: 600 }}>
            {results.length} records found
          </span>
        )}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!hasSearched ? (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#374151' }}>Search the Entire Database</h3>
            <p style={{ fontSize: '15px', maxWidth: '400px' }}>
              Enter a name above to search across <strong>all</strong> arrests, traffic citations, traffic accidents, and crime reports.
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.entries(typeStyles).map(([key, style]) => (
                <span key={key} style={{ background: style.badge, color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                  {style.label}
                </span>
              ))}
            </div>
          </div>
        ) : searching ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
              <p style={{ fontSize: '16px' }}>Searching entire database for "{searchText}"...</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔎</div>
              <p style={{ fontSize: '16px' }}>No records found for "{searchText}"</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>Try a different name or partial name</p>
            </div>
          </div>
        ) : (
          <>
            {/* Map */}
            {mapPoints.length > 0 && (
              <div style={{ height: mapHeight + 'px', minHeight: '150px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                <SplitView mapPoints={mapPoints} mapHeight={mapHeight} setMapHeight={setMapHeight} mapRef={mapRef}>
                  <div></div>
                </SplitView>
              </div>
            )}

            {/* Color-coded Data Table */}
            <div className="results-scroll" style={{ flex: 1, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <table className="results-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1e3a5f', color: 'white', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Date/Time</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Charge/Nature</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => {
                    const style = typeStyles[row.type] || typeStyles['ARREST'];
                    const dateDisplay = row.date ? new Date(row.date).toLocaleDateString() : 'N/A';
                    return (
                      <tr
                        key={i}
                        onClick={() => { zoomToRow(row); onRowClick(row); }}
                        style={{
                          background: style.bg,
                          borderLeft: `4px solid ${style.border}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                      >
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            background: style.badge,
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>{style.label}</span>
                        </td>
                        <td style={{ padding: '10px', color: style.text, fontWeight: 500 }}>{dateDisplay}</td>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{row.name || 'N/A'}</td>
                        <td style={{ padding: '10px' }}>{row.details || row.charge || 'N/A'}</td>
                        <td style={{ padding: '10px', color: '#6b7280' }}>{row.location || 'N/A'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// 2. DEFINE COLUMNS FOR THE NEW GRIDS
const crimeColumns = [
  { key: 'event_time', name: 'event_time' },
  { key: 'charge', name: 'Charge' },
  { key: 'name', name: 'Name' },
  { key: 'location', name: 'Location' },
  { key: 'agency', name: 'Agency' },
  { key: 'event_number', name: 'Event #' }
]

const arrestColumns = [
  { key: 'event_time', name: 'event_time' },
  { key: 'charge', name: 'Charge' },
  { key: 'name', name: 'Name' },
  { key: 'location', name: 'Location' },
  { key: 'agency', name: 'Agency' },
  { key: 'event_number', name: 'Event #' }
];

const reoffenderColumns = [
  { key: 'event_time', name: 'Arrest Time' },
  { key: 'ArrestRecordName', name: 'Arrest Name' },
  { key: 'ArrestCharge', name: 'Arrest Charge' },
  { key: 'OriginalOffenses', name: 'Original Offenses' },
];

const sexOffenderColumns = [
  { key: 'first_name', name: 'First Name' },
  { key: 'middle_name', name: 'Middle Name' },
  { key: 'last_name', name: 'Last Name' },
  { key: 'address_line_1', name: 'Address' },
  { key: 'city', name: 'City' },
  { key: 'tier', name: 'Tier' }
];

const incidentColumns = [
  { key: 'starttime', name: 'Start Time' },
  { key: 'nature', name: 'Nature' },
  { key: 'address', name: 'Address' },
  { key: 'agency', name: 'Agency' },
  { key: 'service', name: 'Service' }
]

const correctionsColumns = [
  { key: 'DateScraped', name: 'Date Scraped' },
  { key: 'Name', name: 'Name' },
  { key: 'Age', name: 'Age' },
  { key: 'Gender', name: 'Gender' },
  { key: 'Offense', name: 'Offense' },
  { key: 'Location', name: 'Location' }
]

const dispatchColumns = [
  { key: 'TimeReceived', name: 'Time Received' },
  { key: 'NatureCode', name: 'Nature' },
  { key: 'LocationAddress', name: 'Address' },
  { key: 'AgencyCode', name: 'Agency' },
  { key: 'IncidentNumber', name: 'Incident #' }
]

const trafficColumns = [
  { key: 'event_time', name: 'Event Time' },
  { key: 'charge', name: 'Charge' },
  { key: 'location', name: 'Location' },
  { key: 'name', name: 'Name' },
  { key: 'key', name: 'Type' }
]

const jailColumns = [
  { key: 'arrest_date', name: 'Booked Date' },
  { key: 'lastname', name: 'Last Name' },
  { key: 'firstname', name: 'First Name' },
  { key: 'charges', name: 'Charges' },
  { key: 'total_bond_amount', name: 'Bond' }
]

export function AppContent() {
  const [activeTab, setActiveTab] = useState('Home');
  const [loading, setLoading] = useState(false);

  // Theme State
  const [theme, setTheme] = useState('day'); // 'day' | 'night'

  const [cadResults, setCadResults] = useState([]);
  const [arrestResults, setArrestResults] = useState([]);
  const [crimeResults, setCrimeResults] = useState([]);
  const [trafficResults, setTrafficResults] = useState([]);
  const [sexOffenderResults, setSexOffenderResults] = useState([]);
  const [correctionsResults, setCorrectionsResults] = useState([]);
  const [reoffendersResults, setReoffendersResults] = useState([]);
  const [jailResults, setJailResults] = useState([]);
  const [dispatchResults, setDispatchResults] = useState([]);
  const [databaseStats, setDatabaseStats] = useState({
    cad: { count: 0, latest: null },
    arrests: { count: 0, latest: null },
    crime: { count: 0, latest: null },
    traffic: { count: 0, latest: null },
    sex_offenders: { count: 0, latest: null },
    corrections: { count: 0, latest: null },
    jail: { count: 0, latest: null }
  });

  const [mapHeight, setMapHeight] = useState(400);

  // Selected Items needed for Modals
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [selectedSexOffender, setSelectedSexOffender] = useState(null);
  const [selectedOffender, setSelectedOffender] = useState(null);
  const [selectedViolator, setSelectedViolator] = useState(null);
  const [selected360Record, setSelected360Record] = useState(null);

  // Date State for Home/Replay
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 19).replace('T', ' ');
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 19).replace('T', ' '));

  // Limits
  const [cadLimit, setCadLimit] = useState(1000);
  const [arrestLimit, setArrestLimit] = useState(1000);
  const [crimeLimit, setCrimeLimit] = useState(1000);

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch all data in parallel
      const [incidentsRes, trafficRes, reoffRes, sexOffRes, corrRes, dispRes, jailRes, dbStatsRes] = await Promise.all([
        getIncidents({ cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, filters: '' }),
        api.getTraffic({ limit: cadLimit, dateFrom, dateTo }),
        api.getReoffenders({ limit: cadLimit, dateFrom, dateTo }),
        api.getSexOffenders({ limit: cadLimit }),
        api.getCorrections({ limit: cadLimit }),
        api.getDispatch({ limit: cadLimit, dateFrom, dateTo }),
        api.getJailInmates(), // Fetch Jail Data
        api.getDatabaseStats() // Fetch DB Stats
      ]);

      let allIncidents = incidentsRes?.response?.data?.data || [];
      let trafficRows = trafficRes?.response?.data?.data || [];

      // Process Traffic Rows
      trafficRows = trafficRows.map(r => {
        let source = 'Traffic';
        if (r.key === 'TC') source = 'TrafficCitation';
        if (r.key === 'TA') source = 'TrafficAccident';
        return { ...r, _source: source, nature: r.charge };
      });

      // Combine for geocoding
      const combinedForMap = [...allIncidents, ...trafficRows];

      const updateDerivedStates = (points) => {
        const cadRows = points.filter(r => r._source === 'cadHandler');
        const arrRows = points.filter(r => r._source === 'DailyBulletinArrests');
        const crimeRows = points
          .filter(r => r._source === 'Crime')
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));
        const trafRows = points
          .filter(r => r._source === 'Traffic' || r._source === 'TrafficCitation' || r._source === 'TrafficAccident')
          .sort((a, b) => new Date(b.event_time) - new Date(a.event_time));

        setCadResults(cadRows);
        setArrestResults(arrRows);
        setCrimeResults(crimeRows);
        setTrafficResults(trafRows);
      };

      updateDerivedStates(combinedForMap);

      setReoffendersResults(reoffRes?.response?.data?.data || []);

      let sexOffRows = sexOffRes?.response?.data?.data || [];
      sexOffRows = sexOffRows.map(r => ({
        ...r,
        _source: 'SexOffender',
        nature: `Sex Offender (${r.tier})`,
        location: r.address_line_1
      }));
      setSexOffenderResults(sexOffRows);

      setCorrectionsResults(corrRes?.response?.data?.data || []);
      setDispatchResults(dispRes?.response?.data?.data || []);
      setJailResults(jailRes?.response?.data?.data || []);
      setDatabaseStats(dbStatsRes || {});

      setLoading(false);

    } catch (err) {
      console.error('Error fetching data', err);
      setLoading(false);
    }
  }, [cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, setLoading, setCadResults, setArrestResults, setCrimeResults, setTrafficResults, setReoffendersResults, setSexOffenderResults, setCorrectionsResults, setDispatchResults, setJailResults, setDatabaseStats]);

  useEffect(() => {
    fetchData();
  }, [cadLimit, arrestLimit, crimeLimit, dateFrom, dateTo, fetchData])

  // Determine styles based on theme
  const isNight = theme === 'night';
  const appStyle = {
    fontFamily: "'Inter', sans-serif",
    height: '100vh',
    display: 'flex',
    backgroundColor: isNight ? '#111827' : '#f3f4f6',
    color: isNight ? '#f3f4f6' : '#1f2937'
  };

  const headerStyle = {
    backgroundColor: isNight ? '#1f2937' : '#3b82f6',
    color: 'white',
    padding: '16px 24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const containerStyle = {
    flex: 1,
    padding: '24px',
    overflowY: 'auto'
  };

  return (
    <div className={`app-container ${isNight ? 'theme-night' : 'theme-day'}`} style={appStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>CrimeTime</h1>
          {loading && <span style={{ fontSize: '14px', opacity: 0.8 }}>⚡ Updating...</span>}
        </div>

        {/* Theme Selector */}
        <select
          value={theme}
          onChange={e => setTheme(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '6px', border: 'none',
            backgroundColor: isNight ? '#374151' : 'white',
            color: isNight ? 'white' : '#1f2937',
            cursor: 'pointer', fontWeight: '500'
          }}
        >
          <option value="day">☀️ Day Mode</option>
          <option value="night">🌙 Night Mode</option>
        </select>
      </div>

      <div style={containerStyle}>
        {/* Pass theme to main content wrapper if needed for specific internal styling overriding */}
        <div style={{ backgroundColor: isNight ? '#1f2937' : 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs>

            {/* 0. Home Tab */}
            <Tab label="Home">
              <div className="home-container">
                <a href="http://realdubuque.news" target="_blank" rel="noopener noreferrer" className="home-link">
                  Real Dubuque News ↗
                </a>
              </div>
            </Tab>

            {/* 1. 360 Degree Tab */}
            <Tab label="360°">
              <View360Content
                mapHeight={mapHeight}
                setMapHeight={setMapHeight}
                onRowClick={(row) => {
                  if (row.type === 'SEX_OFFENDER') {
                    setSelectedSexOffender(row.raw);
                  } else if (['PROBATION', 'PAROLE', 'DOC'].includes(row.type)) {
                    setSelectedOffender(row.id);
                  } else {
                    setSelected360Record(row);
                  }
                }}
              />
            </Tab>

            {/* 3. 720 Degree Tab */}
            <Tab label="720°">
              <Tab720
                onRowClick={() => { }}
                mapHeight={mapHeight}
                setMapHeight={setMapHeight}
              />
            </Tab>

            {/* 2. Replay Tab (formerly Home) */}
            <Tab label="Replay">
              <CrimeTimeReplay
                cadResults={cadResults}
                arrestResults={arrestResults}
                crimeResults={crimeResults}
                sexOffenderResults={sexOffenderResults}
                trafficResults={trafficResults}
              />
            </Tab>

            {/* 4. Records Tab */}
            <Tab label="Records">
              <RecordsTab
                correctionsColumns={correctionsColumns}
                reoffenderColumns={reoffenderColumns}
                sexOffenderColumns={sexOffenderColumns}
                jailColumns={jailColumns}

                setSelectedOffender={setSelectedOffender}
                setSelectedViolator={setSelectedViolator}
                setSelectedSexOffender={setSelectedSexOffender}
                setSelectedInmate={setSelectedInmate}

                mapHeight={mapHeight}
                setMapHeight={setMapHeight}
              />
            </Tab>

            {/* 5. Data Science Tab */}
            <Tab label="Data Science">
              <DataScience
                cadResults={cadResults}
                arrestResults={arrestResults}
                crimeResults={crimeResults}
                trafficResults={trafficResults}
                sexOffenderResults={sexOffenderResults}
                correctionsResults={correctionsResults}
                jailResults={jailResults}
                databaseStats={databaseStats}
                onIntervalChange={async (interval) => {
                  setLoading(true);
                  const now = new Date();
                  let from = new Date();

                  switch (interval) {
                    case '1wk': from.setDate(now.getDate() - 7); break;
                    case '2wk': from.setDate(now.getDate() - 14); break;
                    case '3wk': from.setDate(now.getDate() - 21); break;
                    case '1mnth': from.setMonth(now.getMonth() - 1); break;
                    case '3mnth': from.setMonth(now.getMonth() - 3); break;
                    case '6mnth': from.setMonth(now.getMonth() - 6); break;
                    case '9mnth': from.setMonth(now.getMonth() - 9); break;
                    case '1yr': from.setFullYear(now.getFullYear() - 1); break;
                    default: from.setDate(now.getDate() - 7); // default 1wk
                  }

                  const fromStr = from.toISOString().slice(0, 19).replace('T', ' ');
                  const toStr = now.toISOString().slice(0, 19).replace('T', ' ');

                  setDateFrom(fromStr);
                  setDateTo(toStr);

                  // Set high limits to get "full dataset" for the range
                  setCadLimit(10000);
                  setArrestLimit(10000);
                  setCrimeLimit(10000);

                  // fetchData will be triggered by the useEffect on [dateFrom, dateTo, limits]
                  // However, setting state is async. 
                  // The existing useEffect: useEffect(() => { fetchData(); }, [cadLimit, ...])
                  // will catch these changes.
                }}
                loading={loading}
              />
            </Tab>

          </Tabs>
        </div>
      </div>
      {selectedInmate && <JailModal inmate={selectedInmate} onClose={() => setSelectedInmate(null)} />}
      {selectedSexOffender && <SexOffenderModal offender={selectedSexOffender} onClose={() => setSelectedSexOffender(null)} />}
      {selectedOffender && <OffenderModal offenderNumber={selectedOffender} onClose={() => setSelectedOffender(null)} />}
      {selectedViolator && <ViolatorModal violator={selectedViolator} onClose={() => setSelectedViolator(null)} />}
      {selected360Record && <View360Modal record={selected360Record} onClose={() => setSelected360Record(null)} />}
    </div>
  )
}

export default function App() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileApp /> : <AppContent />;
}