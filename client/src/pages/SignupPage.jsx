import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Upload,
  User,
  ArrowLeft
} from 'lucide-react';

export default function SignupPage() {
  const { signup, checkRollNumber } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Roll check, 2: Details, 3: Photos

  // Step 1 State
  const [rollNumber, setRollNumber] = useState('');
  const [verifyingRoll, setVerifyingRoll] = useState(false);
  const [rollVerified, setRollVerified] = useState(false);
  const [rollError, setRollError] = useState('');

  // Step 2 State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState('Male');
  const [bio, setBio] = useState('');

  // Step 3 State
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [coverPhotoFile, setCoverPhotoFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Step 1: Verify Roll Number against Whitelist
  const handleVerifyRoll = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      setRollError('Please enter your college roll number.');
      return;
    }

    setVerifyingRoll(true);
    setRollError('');

    try {
      const res = await checkRollNumber(rollNumber.trim());
      if (res.success) {
        setRollVerified(true);
        if (res.data.fullName) setFullName(res.data.fullName);
        if (res.data.branch) setBranch(res.data.branch);
        if (res.data.year) setYear(res.data.year);
        toast.success('Roll number verified on campus whitelist!');
        setStep(2);
      } else {
        setRollError(res.message);
      }
    } catch (err) {
      setRollError(err.response?.data?.message || 'Roll number is not whitelisted by administration.');
    } finally {
      setVerifyingRoll(false);
    }
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
      setProfilePhotoFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleCoverPhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPhotoFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('rollNumber', rollNumber.trim());
      formData.append('fullName', fullName.trim());
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('phone', phone);
      formData.append('dob', dob);
      formData.append('branch', branch);
      formData.append('year', year);
      formData.append('gender', gender);
      formData.append('bio', bio);

      if (profilePhotoFile) {
        formData.append('profilePhoto', profilePhotoFile);
      }
      if (coverPhotoFile) {
        formData.append('coverPhoto', coverPhotoFile);
      }

      const res = await signup(formData);
      if (res.success) {
        toast.success('Account created successfully! Welcome to CampusConnect.');
        navigate('/');
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-campus-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 mb-2 text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-campus-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-campus-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black">CampusConnect</span>
          </Link>
          <p className="text-xs text-slate-400">
            Whitelisted registration for verified campus members
          </p>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-between mb-6 px-4">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-campus-400' : 'text-slate-600'}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">1</span>
            <span>Whitelist Check</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-700" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-campus-400' : 'text-slate-600'}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">2</span>
            <span>Student Info</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-700" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-campus-400' : 'text-slate-600'}`}>
            <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">3</span>
            <span>Profile Photo</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-7 shadow-2xl border border-white/20">
          {/* STEP 1: Whitelist Check */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <ShieldCheck className="w-5 h-5 text-campus-600" />
                <h2 className="text-lg font-bold text-slate-800">Roll Number Whitelist Gate</h2>
              </div>
              <p className="text-xs text-slate-500 mb-6">
                To guarantee safety, only students pre-approved on the campus administration database can register.
              </p>

              <form onSubmit={handleVerifyRoll} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Your Official Roll Number
                  </label>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => {
                      setRollNumber(e.target.value.toUpperCase());
                      setRollError('');
                    }}
                    placeholder="e.g. 21EC015, 22ME042, 23IT088"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold tracking-wider uppercase focus:outline-none focus:bg-white focus:border-campus-500 focus:ring-3 focus:ring-campus-100 transition"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Pre-whitelisted demo roll numbers: <span className="font-semibold text-slate-600">21EC015, 22ME042, 23IT088</span>
                  </p>
                </div>

                {rollError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Access Denied</p>
                      <p>{rollError}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifyingRoll}
                  className="w-full py-3.5 bg-campus-600 hover:bg-campus-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {verifyingRoll ? (
                    <span>Verifying Roll Number...</span>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                Already registered?{' '}
                <Link to="/login" className="font-bold text-campus-600 hover:underline">
                  Log in
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: Personal Details */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Student Profile Details</h2>
                  <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Whitelisted Roll: {rollNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Change
                </button>
              </div>

              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aryan Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">College Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Department / Branch</label>
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="Computer Science, Mechanical, etc."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                      required
                    >
                      <option value="">Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Postgraduate">Postgraduate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Short Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    placeholder="Tell your campus peers about your interests, clubs, or hobbies..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-2 focus:ring-campus-200 resize-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!fullName || !email || !password || !branch || !year) {
                      toast.error('Please complete all required fields.');
                      return;
                    }
                    if (password.length < 6) {
                      toast.error('Password must be at least 6 characters.');
                      return;
                    }
                    setStep(3);
                  }}
                  className="px-6 py-2.5 bg-campus-600 hover:bg-campus-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition"
                >
                  <span>Next: Photos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Photo Uploads */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Profile & Cover Media</h2>
              <p className="text-xs text-slate-500 mb-5">
                Add a profile photo so your classmates can identify you.
              </p>

              <div className="space-y-4">
                {/* Profile Photo */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
                    {profilePreview ? (
                      <img src={profilePreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Profile Picture
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoChange}
                      className="text-xs text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-campus-100 file:text-campus-700 hover:file:bg-campus-200 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Cover Photo */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Cover Banner Photo (Optional)
                  </label>
                  {coverPreview && (
                    <div className="w-full h-24 rounded-xl overflow-hidden mb-2 border border-slate-200">
                      <img src={coverPreview} alt="cover preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoChange}
                    className="text-xs text-slate-500 file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-campus-100 file:text-campus-700 hover:file:bg-campus-200 cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-campus-600 to-indigo-600 hover:from-campus-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-campus-500/25 transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
