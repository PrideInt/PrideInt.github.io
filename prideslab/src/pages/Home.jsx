import { Helmet } from 'react-helmet'

import Styles from './Home.module.css'
import favicon from '../assets/pl.png'
import LifeBackground from '../components/LifeBackground'
import SidePanels from '../components/SidePanels'
import Typewriter from '../components/Typewriter'
import { about, links, pages, profile, projects, research } from '../data/portfolio'

const sections = ['projects', 'research', 'about', 'more', 'contact']

// The site uses HashRouter, so "#projects" would be read as a route.
// Scroll to sections in JS instead of using plain anchor links.
const scrollTo = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const isExternal = (href) => /^https?:\/\//.test(href);

function TextLink({ href, children }) {
    return (
        <a
            className={Styles.link}
            href={href}
            {...(isExternal(href) ? { target: '_blank', rel: 'noreferrer' } : {})}>
            {children}
        </a>
    )
}

// Sets the listed words (e.g. genus names) in italics
function Italicize({ text, words = [] }) {
    if (!words.length) return text;
    const pattern = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
    return text.split(pattern).map((part, i) => (words.includes(part) ? <em key={i}>{part}</em> : part));
}

const pad = (i) => String(i + 1).padStart(2, '0');

function Entry({ index, title, year, children }) {
    return (
        <li className={Styles.project}>
            <span className={Styles.index}>{pad(index)}</span>
            <div>
                <div className={Styles.projectHead}>
                    <h3 className={Styles.projectTitle}>{title}</h3>
                    <span className={Styles.year}>{year}</span>
                </div>
                {children}
            </div>
        </li>
    )
}

function EntryLinks({ items }) {
    return (
        <span className={Styles.projectLinks}>
            {items.map((l) => (
                <TextLink key={l.label} href={l.href}>{l.label} &rarr;</TextLink>
            ))}
        </span>
    )
}

function Home() {
    return (
        <div className={Styles.home}>
            <Helmet>
                <title>Pride's Lab</title>
                <meta name="description" content="I'm Pride. This is my lab. I might be looking at some cells under a microscope. Or coding them into this really cool looking website." />
                <link rel="icon" type="image/png" href={favicon} sizes="16x16" />
            </Helmet>

            <LifeBackground />
            <SidePanels />

            <div className={Styles.page}>
                <header className={Styles.header}>
                    <a className={Styles.brand} href="#/" onClick={scrollTo('top')}>PRIDE'S LAB</a>
                    <nav className={Styles.nav}>
                        {sections.map((id) => (
                            <a key={id} href={`#/${id}`} onClick={scrollTo(id)}>{id}</a>
                        ))}
                    </nav>
                </header>

                <main>
                    <Typewriter id="top" className={Styles.hero}>
                        <p className={Styles.kicker}><span className={Styles.cell} />INT. LAB, fade in.</p>
                        <h1 className={Styles.title}>I'm {profile.name}.</h1>
                        <p className={Styles.tagline}>{profile.tagline}</p>
                        <p className={Styles.intro}>{profile.intro}</p>
                        <ul className={Styles.inlineLinks}>
                            {links.map((l) => (
                                <li key={l.label}><TextLink href={l.href}>{l.label}</TextLink></li>
                            ))}
                        </ul>
                    </Typewriter>

                    <Typewriter id="projects" className={Styles.section}>
                        <h2 className={Styles.heading}>Projects</h2>
                        <ol className={Styles.projects}>
                            {projects.map((p, i) => (
                                <Entry key={p.title} index={i} title={p.title} year={p.year}>
                                    <p className={Styles.description}>{p.description}</p>
                                    <div className={Styles.meta}>
                                        <span className={Styles.tags}>{p.tags.join(' / ')}</span>
                                        <EntryLinks items={p.links} />
                                    </div>
                                </Entry>
                            ))}
                        </ol>
                    </Typewriter>

                    <Typewriter id="research" className={Styles.section}>
                        <h2 className={Styles.heading}>Research</h2>
                        <ol className={Styles.projects}>
                            {research.map((r, i) => (
                                <Entry key={r.title} index={i} title={<Italicize text={r.title} words={r.italics} />} year={r.year}>
                                    <p className={Styles.citation}>
                                        {r.authors} <span className={Styles.venue}>{r.venue}</span>
                                    </p>
                                    <p className={Styles.description}><Italicize text={r.summary} words={r.italics} /></p>
                                    {r.role && <p className={Styles.role}>My part: {r.role}</p>}
                                    <div className={Styles.meta}>
                                        <span className={Styles.tags}>{r.kind}</span>
                                        <EntryLinks items={r.links} />
                                    </div>
                                </Entry>
                            ))}
                        </ol>
                    </Typewriter>

                    <Typewriter id="about" className={Styles.section}>
                        <h2 className={Styles.heading}>About</h2>
                        {about.map((paragraph) => (
                            <p key={paragraph} className={Styles.body}>{paragraph}</p>
                        ))}
                        <p className={`${Styles.body} ${Styles.hint}`}>
                            There are a couple of lights at the edges of the screen. One plays the music for this site; the other shows what I've been watching lately. You can also push the cells around.
                        </p>
                    </Typewriter>

                    <Typewriter id="more" className={Styles.section}>
                        <h2 className={Styles.heading}>More</h2>
                        <ul className={Styles.moreList}>
                            {pages.map((page) => (
                                <li key={page.href}>
                                    <a className={Styles.moreLink} href={page.href}>
                                        <span className={Styles.moreTitle}>{page.title} <span className={Styles.moreArrow}>&rarr;</span></span>
                                        <span className={Styles.moreDescription}>{page.description}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Typewriter>

                    <Typewriter id="contact" className={Styles.section}>
                        <h2 className={Styles.heading}>Contact</h2>
                        <p className={Styles.body}>
                            The best way to reach me is by email. I am also on GitHub.
                        </p>
                        <ul className={Styles.inlineLinks}>
                            {links.map((l) => (
                                <li key={l.label}><TextLink href={l.href}>{l.label}</TextLink></li>
                            ))}
                        </ul>
                    </Typewriter>
                </main>

                <footer className={Styles.footer}>
                    <span>&copy; {new Date().getFullYear()} {profile.fullName}</span>
                    <span>
                        fade out.
                    </span>
                </footer>
            </div>
        </div>
    )
}

export default Home
