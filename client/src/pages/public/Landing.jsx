import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Landing = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    department_name: '', institution: '', requester_name: '',
    requester_email: '', requester_phone: '', class_size: '', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkEmail, setCheckEmail] = useState('');
  const [checkResult, setCheckResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/department-requests', {
        ...formData,
        class_size: parseInt(formData.class_size) || 0
      });
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheck = async () => {
    if (!checkEmail) return;
    try {
      const res = await api.get(`/department-requests/check/email/${checkEmail}`);
      setCheckResult(res.data);
    } catch { setCheckResult([]); }
  };

  return (
    <div className="min-h-screen bg-base relative overflow-hidden">
      {/* Glow orbs */}
      <div className="glow-orb" style={{ top: '-100px', left: '50%', transform: 'translateX(-50%)' }} />
      <div className="glow-orb" style={{ bottom: '-200px', right: '-100px', width: '500px', height: '500px' }} />

      {/* Navbar */}
      <nav className="relative z-10 max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
          <span className="font-heading font-bold text-xl text-white">Quota Manager</span>
        </div>
        <Link to="/login" className="btn-secondary text-sm !px-5 !py-2.5">
          Login →
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 pt-16 pb-20 text-center">
        <div className="inline-block mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-accent bg-accent/10 px-4 py-1.5 rounded-full border border-accent/20">
            Rotation Quota Management
          </span>
        </div>
        <h1 className="font-heading text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Managed Friday leaves
          <br />
          <span className="text-gradient">for every student.</span>
        </h1>
        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          An intelligent quota-based leave management system that ensures every 
          student gets optimal opportunity for Friday leaves. Powered by rotation algorithms.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={() => setShowForm(true)} className="btn-primary text-lg !px-8 !py-4">
            Request Quota Manager &rarr;
          </button>
          <Link to="/login" className="btn-secondary text-lg !px-8 !py-4">
            Login to Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold tracking-widest uppercase text-accent">How It Works</span>
          <h2 className="font-heading text-3xl font-bold text-white mt-3">
            Transforming leave management into
            <br /><span className="text-gradient">smart rotation solutions.</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: 'R', title: 'Rotation Algorithm', desc: 'Smart scoring system ensures students who haven\'t had recent leaves get priority next time.' },
            { icon: 'C', title: 'Smart Calendar', desc: 'Auto-detects holidays, exam periods, and breaks. Calculates quota averages automatically.' },
            { icon: 'T', title: 'Full Transparency', desc: 'Students see their queue position, confidence level, and complete leave history.' },
          ].map((f, i) => (
            <div key={i} className="glass-card-hover p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 font-bold text-accent">
                <span className="text-2xl">{f.icon}</span>
              </div>
              <span className="text-xs text-accent font-semibold">STEP 0{i + 1}</span>
              <h3 className="font-heading text-lg text-white mt-2 mb-2">{f.title}</h3>
              <p className="text-text-secondary text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative max-w-lg w-full bg-card border border-border-subtle rounded-2xl shadow-xl animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border-subtle flex justify-between items-center">
              <h2 className="font-heading text-xl text-white">Request Quota Manager</h2>
              <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-white text-xl">x</button>
            </div>
            
            {submitted ? (
              <div className="p-8 text-center">
                <h3 className="font-heading text-xl text-white mb-2 pt-4">Request Submitted!</h3>
                <p className="text-text-secondary mb-6">Super Admin will review your request.</p>
                
                {/* Check status section */}
                <div className="border-t border-border-subtle pt-6 mt-6">
                  <p className="text-sm text-text-secondary mb-3">Check your request status:</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={checkEmail}
                      onChange={e => setCheckEmail(e.target.value)}
                      className="input-field flex-1"
                    />
                    <button onClick={handleCheck} className="btn-primary !px-4">Check</button>
                  </div>
                  {checkResult && (
                    <div className="mt-4 space-y-2">
                      {checkResult.length === 0 ? (
                        <p className="text-text-muted text-sm">No requests found for this email.</p>
                      ) : (
                        checkResult.map(r => (
                          <div key={r._id} className="bg-elevated p-3 rounded-lg text-left text-sm">
                            <p className="text-white font-medium">{r.department_name}</p>
                            <p className="text-text-secondary">{r.institution}</p>
                            <span className={`text-xs font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${
                              r.status === 'approved' ? 'bg-success/10 text-success' :
                              r.status === 'rejected' ? 'bg-danger/10 text-danger' :
                              'bg-warning/10 text-warning'
                            }`}>{r.status.toUpperCase()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button onClick={() => setShowForm(false)} className="btn-secondary mt-6">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Institution Name *</label>
                  <input required className="input-field" placeholder="e.g. ABC College of Engineering"
                    value={formData.institution} onChange={e => setFormData({...formData, institution: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Department / Class Name *</label>
                  <input required className="input-field" placeholder="e.g. CSE PG 2024"
                    value={formData.department_name} onChange={e => setFormData({...formData, department_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">Your Name *</label>
                    <input required className="input-field" placeholder="Full name"
                      value={formData.requester_name} onChange={e => setFormData({...formData, requester_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">Class Size</label>
                    <input type="number" className="input-field" placeholder="e.g. 37"
                      value={formData.class_size} onChange={e => setFormData({...formData, class_size: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Email *</label>
                  <input required type="email" className="input-field" placeholder="your@email.com"
                    value={formData.requester_email} onChange={e => setFormData({...formData, requester_email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Phone</label>
                  <input className="input-field" placeholder="+91 9876543210"
                    value={formData.requester_phone} onChange={e => setFormData({...formData, requester_phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Message</label>
                  <textarea className="input-field min-h-[80px] resize-none" placeholder="Tell us about your requirement..."
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="relative z-10 border-t border-border-subtle mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-text-muted text-sm">
          © 2026 Quota Manager — Reliable Friday Leave Management System
        </div>
      </footer>
    </div>
  );
};

export default Landing;
