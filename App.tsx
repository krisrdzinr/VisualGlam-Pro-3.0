
import React, { useState, useRef, useEffect } from 'react';
import { Navbar, Footer } from './components/Layout';
import { transformImagePerspective } from './services/geminiService';
import { ImageState, Category, LightingCategory, AngleDefinition, LightingDefinition, AspectRatio } from './types';

const PHOTO_CATEGORIES: Category[] = [
  {
    title: 'Eye-Level',
    angles: [
      { name: 'Standard Eye', description: 'Camera at subject’s eye height', bestUse: 'Natural portraits, corporate' },
      { name: 'Flattering', description: 'Camera just above eye line', bestUse: 'Fashion portraits' },
      { name: 'Authority', description: 'Camera just below eye line', bestUse: 'Confidence shots' },
    ]
  },
  {
    title: 'Verticality',
    angles: [
      { name: 'High Angle', description: 'Camera above subject looking down', bestUse: 'Editorial looks' },
      { name: 'Bird’s-Eye', description: 'Camera directly overhead', bestUse: 'Creative flat-lays' },
      { name: 'Low Angle', description: 'Camera below looking up', bestUse: 'Heroic, dramatic' },
      { name: 'Worm’s-Eye', description: 'Extreme low upward angle', bestUse: 'Cinematic scale' },
    ]
  },
  {
    title: 'Rotational',
    angles: [
      { name: 'Front View', description: 'Subject faces camera', bestUse: 'ID, formal' },
      { name: '¾ View', description: 'Face turned slightly', bestUse: 'Standard portrait' },
      { name: 'Profile', description: 'Side view', bestUse: 'Editorial profile' },
    ]
  },
  {
    title: 'Framing',
    angles: [
      { name: 'Extreme Close-Up', description: 'Focus on specific features (eyes/lips)', bestUse: 'Intense emotion, detail' },
      { name: 'Close-Up', description: 'Face fills most of the frame', bestUse: 'Beauty, expressions' },
      { name: 'Medium Close-Up', description: 'Subject from chest up', bestUse: 'Standard interviews, intimate' },
      { name: 'Medium Shot', description: 'Subject from waist up', bestUse: 'Lifestyle, interactions' },
      { name: 'Cowboy Shot', description: 'Subject from mid-thigh/knees up', bestUse: 'Attitude, showing holster' },
      { name: 'Full Shot', description: 'Subject head to toe', bestUse: 'Fashion, outfit showcase' },
      { name: 'Extreme Long Shot', description: 'Subject is small in the environment', bestUse: 'Scale, scenery' },
    ]
  },
  {
    title: 'Experimental',
    angles: [
      { name: 'Dutch Angle', description: 'Camera tilted sideways', bestUse: 'Drama, tension' },
      { name: 'Silhouette', description: 'Strong backlight', bestUse: 'Moody artistic' },
      { name: 'POV', description: 'First-person view', bestUse: 'Action shots' },
    ]
  }
];

const LIGHTING_CATEGORIES: LightingCategory[] = [
  {
    title: 'Camera White Balance',
    presets: [
      { name: 'Daylight', description: '5200K – 5600K', effect: 'Neutralizes direct sun warmth' },
      { name: 'Cloudy', description: '6000K', effect: 'Adds amber warmth to cool overcast light' },
      { name: 'Shade', description: '7000K – 8000K', effect: 'Compensates for deep blue shadows' },
    ]
  },
  {
    title: 'Artistic Atmosphere',
    presets: [
      { name: 'Golden Hour', description: 'Sunrise/Sunset soft light', effect: 'Warm, long shadows, gold glow' },
      { name: 'Blue Hour', description: 'Civil twilight', effect: 'Cool, ethereal, deep blue tones' },
      { name: 'Hard Light', description: 'Midday high sun', effect: 'Sharp shadows, high contrast' },
      { name: 'Overcast', description: 'Nature’s softbox', effect: 'Flat, even, shadowless light' },
      { name: 'Window Light', description: 'Directional soft light', effect: 'Classic portrait illumination' },
      { name: 'Dappled Light', description: 'Tree leaf filter', effect: 'Speckled light and shadow spots' },
    ]
  }
];

const ASPECT_RATIOS: { label: string; value: AspectRatio }[] = [
  { label: 'Original', value: 'original' },
  { label: 'Square 1:1', value: '1:1' },
  { label: 'Portrait 3:4', value: '3:4' },
  { label: '4:5', value: '4:5' },
  { label: 'Classic 4:3', value: '4:3' },
  { label: 'Story 9:16', value: '9:16' },
  { label: 'Cinema 16:9', value: '16:9' },
];

const LOADING_MESSAGES = [
  "Analyzing image composition and facial structure...",
  "Calculating 3D camera coordinates for the new angle...",
  "Adjusting virtual focal length and lens aperture...",
  "Synthesizing volumetric lighting and shadows...",
  "Rendering high-fidelity textures and skin details...",
  "Finalizing cinematic master and color grading..."
];

const App: React.FC = () => {
  const [selectedAngle, setSelectedAngle] = useState<AngleDefinition | 'Custom'>(PHOTO_CATEGORIES[0].angles[0]);
  const [selectedLighting, setSelectedLighting] = useState<LightingDefinition | 'Default'>(LIGHTING_CATEGORIES[0].presets[0]);
  const [angleEnabled, setAngleEnabled] = useState<boolean>(true);
  const [lightingEnabled, setLightingEnabled] = useState<boolean>(true);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('original');
  const [faceConsistency, setFaceConsistency] = useState<boolean>(true);
  const [poseAttireConsistency, setPoseAttireConsistency] = useState<boolean>(true);
  const [highRes, setHighRes] = useState<boolean>(false);
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [activePrompt, setActivePrompt] = useState<string>("");
  const [autoSave, setAutoSave] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  
  const [imageState, setImageState] = useState<ImageState>({
    original: null,
    referencePose: null,
    transformed: null,
    loading: false,
    error: null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const poseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: any;
    if (imageState.loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [imageState.loading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'original' | 'pose') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageState(prev => ({ ...prev, error: 'Please upload a valid image file.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageState(prev => ({
        ...prev,
        [type === 'original' ? 'original' : 'referencePose']: event.target?.result as string,
        transformed: null,
        loading: false,
        error: null,
      }));
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `visualglam-pro-3-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const useAsReference = (url: string) => {
    setImageState({
      original: url,
      referencePose: null,
      transformed: null,
      loading: false,
      error: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTransform = async () => {
    if (!imageState.original) {
      setImageState(prev => ({ ...prev, error: "Please upload a Target Identity image first." }));
      return;
    }

    setImageState(prev => ({ ...prev, loading: true, error: null, transformed: null }));

    try {
      const angleName = !angleEnabled ? 'Original Perspective' : (selectedAngle === 'Custom' ? 'Custom Perspective' : selectedAngle.name);
      const angleDesc = !angleEnabled ? 'Maintain exact camera angle and perspective' : (selectedAngle === 'Custom' ? 'Custom composition' : selectedAngle.description);
      const lightingName = !lightingEnabled ? 'Preserve Original' : (selectedLighting === 'Default' ? 'Natural Light' : selectedLighting.name);
      const lightingDesc = !lightingEnabled ? 'Keep original lighting and environment' : (selectedLighting === 'Default' ? 'Standard exposure' : selectedLighting.description);

      const numVariations = batchMode ? 3 : 1;
      
      const transformPromises = Array.from({ length: numVariations }).map(() => 
        transformImagePerspective(
          imageState.original!, 
          angleName, 
          lightingName, 
          angleDesc, 
          lightingDesc,
          activePrompt,
          selectedAspectRatio,
          faceConsistency,
          highRes,
          poseAttireConsistency,
          imageState.referencePose
        )
      );

      const results = await Promise.all(transformPromises);
      
      setImageState(prev => ({ ...prev, transformed: results, loading: false }));
      
      if (autoSave && results.length > 0) {
        results.forEach(url => downloadImage(url));
      }
    } catch (err: any) {
      console.error("Transformation sequence error:", err);
      const msg = err.message === 'QUOTA_EXCEEDED' 
        ? 'API quota exhausted. Please try again later.' 
        : (err.message || 'Transformation failed. Try a different combination.');
        
      setImageState(prev => ({ ...prev, loading: false, error: msg }));
    }
  };

  const clearApp = () => {
    setImageState({
      original: null,
      referencePose: null,
      transformed: null,
      loading: false,
      error: null,
    });
    setActivePrompt("");
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (poseInputRef.current) poseInputRef.current.value = '';
  };

  const isAngleSelected = (angle: AngleDefinition | 'Custom') => {
    if (angle === 'Custom') return selectedAngle === 'Custom';
    return typeof selectedAngle !== 'string' && selectedAngle.name === angle.name;
  };

  const isLightingSelected = (lighting: LightingDefinition | 'Default') => {
    if (lighting === 'Default') return selectedLighting === 'Default';
    return typeof selectedLighting !== 'string' && selectedLighting.name === lighting.name;
  };

  const getContainerAspectRatio = () => {
    if (selectedAspectRatio === 'original') return 'auto';
    return selectedAspectRatio.replace(':', '/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleFileUpload(e, 'original')} 
        />
        <input 
          type="file" 
          ref={poseInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={(e) => handleFileUpload(e, 'pose')} 
        />

        {!imageState.original ? (
          <div className="max-w-2xl mx-auto text-center py-12">
            <h1 className="text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-200 to-slate-400">
              Virtual Camera Studio
            </h1>
            <p className="text-slate-400 text-xl mb-12">
              Re-shoot any photo with professional camera angles, lighting presets, and custom aspect ratios.
            </p>
            <div 
              className="border-2 border-dashed border-slate-800 bg-slate-900/30 rounded-3xl p-16 text-center hover:border-blue-500/50 hover:bg-slate-900/50 transition-all cursor-pointer group shadow-2xl"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform border border-blue-500/20">
                <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Upload a Photo</h3>
              <p className="text-slate-500 mb-8">Works best with portraits, fashion, and lifestyle shots.</p>
              <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                Choose Image
              </button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white tracking-tight">Studio Configuration</h2>
                  <button onClick={clearApp} className="text-slate-500 hover:text-red-400 text-xs font-bold transition-colors uppercase tracking-widest">
                    Reset
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custom Directives (Optional)</label>
                  <textarea
                    value={activePrompt}
                    onChange={(e) => setActivePrompt(e.target.value)}
                    placeholder="E.g. Change background to Paris, make the outfit look leather..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[80px] transition-all resize-none scrollbar-hide"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">Face consistency</span>
                      <span className="text-[10px] text-slate-500 italic">Preserve identities</span>
                    </div>
                    <button
                      onClick={() => setFaceConsistency(!faceConsistency)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${faceConsistency ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${faceConsistency ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">Pose & Attire Sync</span>
                      <span className="text-[10px] text-slate-500 italic">{imageState.referencePose ? 'Enabled (Using Reference)' : (poseAttireConsistency ? 'Enabled (Strict Original)' : 'Flexible')}</span>
                    </div>
                    <button
                      onClick={() => setPoseAttireConsistency(!poseAttireConsistency)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${poseAttireConsistency ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${poseAttireConsistency ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">Ultra High-Res</span>
                      <span className="text-[10px] text-slate-500 italic">8K UHD Rendering</span>
                    </div>
                    <button
                      onClick={() => setHighRes(!highRes)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${highRes ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highRes ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-200">Batch Mode</span>
                      <span className="text-[10px] text-slate-500 italic">3 Variations</span>
                    </div>
                    <button
                      onClick={() => setBatchMode(!batchMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${batchMode ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${batchMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Aspect Ratio</label>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setSelectedAspectRatio(ratio.value)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          selectedAspectRatio === ratio.value
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Camera Angle Preset</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase ${angleEnabled ? 'text-blue-400' : 'text-slate-600'}`}>
                        {angleEnabled ? 'Active' : 'Bypassed'}
                      </span>
                      <button
                        onClick={() => setAngleEnabled(!angleEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${angleEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${angleEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`space-y-5 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar transition-all duration-300 ${!angleEnabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                    {PHOTO_CATEGORIES.map((cat) => (
                      <div key={cat.title} className="space-y-2">
                        <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.15em] border-b border-slate-800 pb-1">
                          {cat.title}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.angles.map((angle) => (
                            <button
                              key={angle.name}
                              onClick={() => setSelectedAngle(angle)}
                              className={`px-3 py-2 text-left rounded-xl text-[11px] font-medium transition-all border ${
                                isAngleSelected(angle) 
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                              }`}
                            >
                              {angle.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Atmosphere & Lighting</label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold uppercase ${lightingEnabled ? 'text-blue-400' : 'text-slate-600'}`}>
                        {lightingEnabled ? 'Active' : 'Bypassed'}
                      </span>
                      <button
                        onClick={() => setLightingEnabled(!lightingEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${lightingEnabled ? 'bg-blue-600' : 'bg-slate-800'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${lightingEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                  
                  <div className={`space-y-5 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar transition-all duration-300 ${!lightingEnabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                    {LIGHTING_CATEGORIES.map((cat) => (
                      <div key={cat.title} className="space-y-2">
                        <h4 className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.15em] border-b border-slate-800 pb-1">
                          {cat.title}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {cat.presets.map((light) => (
                            <button
                              key={light.name}
                              onClick={() => setSelectedLighting(light)}
                              className={`px-3 py-2 text-left rounded-xl text-[11px] font-medium transition-all border ${
                                isLightingSelected(light) 
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                              }`}
                            >
                              {light.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTransform}
                  disabled={imageState.loading}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {imageState.loading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {batchMode ? 'Executing Multi-Render...' : 'Generating...'}
                    </>
                  ) : (
                    batchMode ? 'GENERATE 3 VARIATIONS' : 'RE-SHOOT PHOTO'
                  )}
                </button>

                {imageState.error && (
                  <div className="p-3 bg-red-400/10 border border-red-500/20 rounded-xl flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-400 text-[11px] font-medium leading-tight">{imageState.error}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Main Input Frame */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Identity (Face Source)</span>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border border-slate-700 shadow-sm group"
                    >
                      <svg className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Swap Image 1
                    </button>
                  </div>
                  <div className="aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative group">
                    <img src={imageState.original!} alt="Original" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none" />
                    <div 
                      className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="bg-white/20 p-4 rounded-full border border-white/40 group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pose & Attire Reference Box */}
                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pose & Attire (Reference Source)</span>
                    {imageState.referencePose && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setImageState(prev => ({ ...prev, referencePose: null })); }}
                        className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider"
                      >
                        Clear Pose
                      </button>
                    )}
                  </div>
                  <div 
                    className={`aspect-[3/4] bg-slate-900/50 rounded-3xl overflow-hidden border-2 border-dashed transition-all duration-300 flex items-center justify-center relative group cursor-pointer ${
                      imageState.referencePose ? 'border-indigo-500/50' : 'border-slate-800 hover:border-indigo-500/30'
                    }`}
                    onClick={() => poseInputRef.current?.click()}
                  >
                    {imageState.referencePose ? (
                      <>
                        <img src={imageState.referencePose} alt="Reference Pose" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-indigo-600 px-4 py-2 rounded-full shadow-lg">Change Image 2</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6 flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600/20 transition-all">
                          <svg className="w-6 h-6 text-slate-500 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-200">Import Asset</span>
                          <span className="block text-[10px] text-slate-600">Body & Clothing Ref</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex justify-between items-end px-1">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    {imageState.loading ? 'Virtual Render Active' : 'AI Rendered Master'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 gap-8">
                  {imageState.loading ? (
                    <div 
                      className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center min-h-[500px]"
                      style={{ aspectRatio: getContainerAspectRatio() }}
                    >
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm px-6">
                        <div className="relative mb-12">
                          <div className="w-24 h-24 border-2 border-blue-500/10 rounded-full animate-ping absolute inset-0"></div>
                          <div className="w-24 h-24 border-2 border-blue-500/20 rounded-full animate-pulse absolute inset-0"></div>
                          <div className="w-24 h-24 border-t-2 border-r-2 border-blue-500 rounded-full animate-spin"></div>
                        </div>

                        <div className="text-center w-full max-w-md space-y-6">
                          <div className="space-y-2">
                            <h4 className="text-white font-black text-xl uppercase tracking-tighter">
                              {batchMode ? 'Executing Multi-Render' : 'Developing Master Frame'}
                            </h4>
                            <p className="text-blue-400/70 text-sm font-medium animate-pulse transition-all duration-700 h-5">
                              {LOADING_MESSAGES[loadingStep]}
                            </p>
                          </div>

                          <div className="flex justify-between gap-1 w-full px-8">
                            {LOADING_MESSAGES.map((_, i) => (
                              <div 
                                key={i} 
                                className={`h-1.5 flex-grow rounded-full transition-all duration-700 ${
                                  i <= loadingStep ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]' : 'bg-slate-800'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : imageState.transformed ? (
                    <div className={`grid gap-6 ${imageState.transformed.length > 1 ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                      {imageState.transformed.map((url, idx) => (
                        <div key={idx} className="space-y-3 group/item">
                          <div 
                            className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center transition-all duration-500 group-hover/item:border-blue-500/30"
                            style={{ aspectRatio: getContainerAspectRatio() }}
                          >
                            <img src={url} alt={`Variation ${idx + 1}`} className="w-full h-full object-contain animate-in fade-in zoom-in duration-700" />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-all duration-300 flex items-end justify-center pb-6 gap-3">
                              <button 
                                onClick={() => downloadImage(url)}
                                className="p-3 bg-white text-slate-950 rounded-xl hover:scale-110 active:scale-90 transition-all shadow-2xl font-bold flex items-center gap-2 text-xs"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Export
                              </button>
                              <button 
                                onClick={() => useAsReference(url)}
                                className="p-3 bg-blue-600 text-white rounded-xl hover:scale-110 active:scale-90 transition-all shadow-2xl font-bold flex items-center gap-2 text-xs"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Loop Identity
                              </button>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                              Variation #{idx + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative flex items-center justify-center min-h-[400px]">
                      <div className="text-center p-12 max-w-[280px]">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 opacity-30">
                          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-slate-600 font-bold leading-relaxed italic">Initiate transformation to generate cinematic results.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 text-center">
                <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed italic">
                  Tip: Upload a <span className="text-indigo-400 font-bold">Pose Reference</span> to swap the identity from Image 1 onto the body of Image 2.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;
