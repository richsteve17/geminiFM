import React, { useState } from 'react';
import { ArrowUpRight, FolderOpen, Mic, Video, AudioLines, Settings2, ChevronRight } from 'lucide-react';
import KitCatalog from './KitCatalog';
import ClubCrest from './ClubCrest';
import { isPaidAudioEnabled, setPaidAudioEnabled, isPaidVideoEnabled, setPaidVideoEnabled, getPaidVoiceName, setPaidVoiceName } from '../services/geminiService';
import { BUILD_INFO } from '../buildInfo';
import { CLUB_ROSTER_SNAPSHOT_DATE } from '../engine/clubRosters';
import { PRODUCT_TITLE } from '../product';

interface StartScreenProps {
    onSelectTeam: () => void;
    onStartUnemployed: () => void;
    onStartWorldCup: () => void;
    onThemeSelect?: (colors: { primary: string, secondary: string, text: string }) => void;
    onContinue?: () => void;
    hasSave?: boolean;
    saveMetadata?: { teamName: string; week: number; year: number; } | null;
    initialTeam?: string;
    tutorialSummary?: string;
}

const StartScreen: React.FC<StartScreenProps> = ({ onSelectTeam, onStartUnemployed, onStartWorldCup, onThemeSelect, onContinue, hasSave, saveMetadata, initialTeam = 'Manchester City', tutorialSummary }) => {
    const [paidAudio, setPaidAudio] = useState(isPaidAudioEnabled());
    const [paidVideo, setPaidVideo] = useState(isPaidVideoEnabled());
    const [paidVoice, setPaidVoice] = useState(getPaidVoiceName());
    const togglePaidAudio = () => { const next = !paidAudio; setPaidAudio(next); setPaidAudioEnabled(next); };
    const togglePaidVideo = () => { const next = !paidVideo; setPaidVideo(next); setPaidVideoEnabled(next); };
    const handleVoiceChange = (voiceName: string) => { setPaidVoice(voiceName); setPaidVoiceName(voiceName); };

    return (
        <main className="fm-home">
            <div className="fm-home-folio">
                <span className="fm-eyebrow">Single player / {BUILD_INFO.season}</span>
                <span className="fm-version">v{BUILD_INFO.version} <span aria-hidden="true">/</span> {BUILD_INFO.checkpoint}</span>
            </div>
            <section className="fm-home-layout" aria-label="Career setup">
                <div className="fm-home-careers">
                    <p className="fm-eyebrow">{PRODUCT_TITLE}</p>
                    <h1 className="fm-home-title">Football<br />Management</h1>
                    <p className="fm-home-deck">AI scouting, press conferences, negotiations and player relationships.</p>
                    <p className="fm-eyebrow mb-4">New-career rosters · {CLUB_ROSTER_SNAPSHOT_DATE}</p>
                    {hasSave && onContinue && (
                        <button type="button" onClick={onContinue} className="fm-resume">
                            {saveMetadata?.teamName && saveMetadata.teamName !== 'Unemployed' ? <ClubCrest teamName={saveMetadata.teamName} className="h-10 w-10 shrink-0" /> : <FolderOpen size={28} aria-hidden="true" />}
                            <span><span className="fm-eyebrow">Saved career</span><strong>Load career</strong><span className="fm-resume-meta">{saveMetadata ? `${saveMetadata.teamName} · Year ${saveMetadata.year}, Week ${saveMetadata.week}` : 'Continue your last saved manager career.'}</span></span>
                            <ArrowUpRight size={22} aria-hidden="true" />
                        </button>
                    )}
                    {hasSave && <p className="mb-4 text-sm">Load preserves your existing career. Start a new career to use the refreshed rosters.</p>}
                    <div className="fm-mode-list">
                        <button type="button" onClick={onStartWorldCup} className="fm-mode fm-mode-tutorial">
                            <span className="fm-mode-number" aria-hidden="true">01</span>
                            <span><span className="fm-eyebrow">Tutorial · Earn your RTG start</span><h2>World Cup</h2><p>Learn management with a nation. Your finish unlocks club opportunities; a World Cup title opens the elite tier.</p></span>
                            <ArrowUpRight size={22} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={onSelectTeam} className="fm-mode">
                            <span className="fm-mode-number" aria-hidden="true">02</span>
                            <span><span className="fm-eyebrow">Career mode</span><h2>Club career</h2><p>Choose any club. World Cup results do not restrict Career mode.</p></span>
                            <ArrowUpRight size={22} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={onStartUnemployed} className="fm-mode">
                            <span className="fm-mode-number" aria-hidden="true">03</span>
                            <span><span className="fm-eyebrow">Hardcore mode</span><h2>Road to glory</h2><p>Start unemployed and apply for jobs. Your World Cup record determines initial opportunities—not a self-selected reputation.</p></span>
                            <ArrowUpRight size={22} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <aside className="fm-home-feature">
                    <figure className="fm-stadium">
                        <img src="/interface/wembley.webp" alt="Wembley Stadium viewed from the stands" fetchPriority="high" />
                        <figcaption><span>Wembley Stadium</span><span>Venue photograph / 2011</span></figcaption>
                    </figure>
                    <div className="fm-home-note">
                        <span className="fm-eyebrow">World Cup → RTG</span>
                        <p role="status">{tutorialSummary || 'Your World Cup record determines initial club opportunities.'}</p>
                        <div className="fm-note-rule" aria-hidden="true" />
                        <span className="fm-eyebrow">AI staff</span>
                        <p>Develop tactics, negotiate contracts, satisfy the board.</p>
                    </div>
                    <p className="fm-photo-credit">Photograph: <a href="https://commons.wikimedia.org/wiki/File:Wembley_Stadium.jpg" target="_blank" rel="noopener noreferrer">Wonker</a> / <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a>. Downscaled; tonal treatment and responsive crop.</p>
                </aside>
            </section>

            <div className="fm-home-settings">
                <details className="fm-settings-disclosure">
                    <summary><span><Settings2 size={17} aria-hidden="true" /> AI API cost & settings control</span><ChevronRight size={18} aria-hidden="true" /></summary>
                    <div className="fm-settings-body">
                        <div className="fm-setting-row">
                            <div><strong><Mic size={16} aria-hidden="true" /> Paid AI Commentary</strong><p>{paidAudio ? 'Gemini API Voices' : 'Local Browser TTS (Free)'}</p></div>
                            <button type="button" className="fm-toggle" onClick={togglePaidAudio} aria-label="Paid AI commentary" role="switch" aria-checked={paidAudio}><span /></button>
                        </div>
                        <div className="fm-setting-row">
                            <div><strong><Video size={16} aria-hidden="true" /> Paid 3D Replay Video</strong><p>{paidVideo ? 'Google Veo Replay Generation' : 'Live 3D Pitch · No Video Generation'}</p></div>
                            <button type="button" className="fm-toggle" onClick={togglePaidVideo} aria-label="Paid replay video" role="switch" aria-checked={paidVideo}><span /></button>
                        </div>
                        {paidAudio && <div className="fm-setting-row"><label htmlFor="commentator-voice"><strong><AudioLines size={16} aria-hidden="true" /> Commentator Voice</strong></label><select id="commentator-voice" className="fm-field" value={paidVoice} onChange={event => handleVoiceChange(event.target.value)}><option value="Puck">Puck (Energetic Male)</option><option value="Charon">Charon (Deep Male)</option><option value="Fenrir">Fenrir (Powerful Male)</option><option value="Aoede">Aoede (Clear Female)</option><option value="Kore">Kore (Crisp Female)</option></select></div>}
                    </div>
                </details>
                <details className="fm-settings-disclosure fm-release">
                    <summary><span>Release record · v{BUILD_INFO.version}</span><ChevronRight size={18} aria-hidden="true" /></summary>
                    <div className="fm-settings-body"><p className="fm-version">{BUILD_INFO.checkpoint} · {BUILD_INFO.builtAt.slice(0, 19).replace('T', ' ')} UTC</p><ul>{BUILD_INFO.changes.map(change => <li key={change}>{change}</li>)}</ul><p>Generated from package version, Git revision and build timestamp.</p></div>
                </details>
            </div>
            <KitCatalog initialTeam={initialTeam} onThemeSelect={onThemeSelect} />
        </main>
    );
};
export default StartScreen;
