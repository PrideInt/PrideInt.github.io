export const profile = {
    name: 'Pride',
    fullName: 'Pride Yin',
    tagline: 'I write code about cells, genomes and games.',
    intro:
        'This is my lab. A place where biology meets software: metabolomics and ' +
        'genome assembly, pharmacogenomics and clinical pathology on one side, ' + 
        'apps and game mods on the way other end of the spectrum. ' + 
        'I used to work in DevOps and AIOps until I pivoted to medicine, biomedical informatics and translational bioinformatics research. ' +
        'Alongside being a computational biomedicine student, I am also a research consultant for U.S. Botanic Garden\'s Rafflesia conservation project. ' + 
        'All\'s to say, I\'m pretty good at what I do.',
}

export const links = [
    { label: 'GitHub', href: 'https://github.com/PrideInt' },
    { label: 'Email', href: 'mailto:pyin@prideslab.com' },
]

export const projects = [
    {
        title: 'Cinematd',
        year: '2026',
        description:
            'A movie diary built for going out: log what you watch, keep a watchlist, ' +
            'chat with other users about upcoming releases, and find theaters showing a ' +
            'film on the Movie Map. Co-founded with Amer Issa; I lead development.',
        tags: ['react', 'firebase', 'vite'],
        links: [
            { label: 'site', href: 'https://cinematd.com' },
            { label: 'code', href: 'https://github.com/Cinematd/Cinematd' },
        ],
    },
    {
        title: 'PGxEngine',
        year: '2026',
        description:
            'An interpretable pharmacogenomics engine that maps star-allele diplotypes for ' +
            'CYP2C19 and CYP2D6 to metabolizer phenotypes and matches them to CPIC ' +
            'recommendations for psychotropic drugs. Educational prototype, not for clinical use.',
        tags: ['python', 'fastapi', 'pharmacogenomics'],
        links: [{ label: 'code', href: 'https://github.com/PrideInt/PGxEngine' }],
    },
    {
        title: 'De Bruijn Graph Assembly',
        year: '2024',
        description:
            'Assembling nucleotide sequences with de Bruijn graphs, following Compeau, ' +
            'Pevzner and Tesler: k-mers become edges, (k-1)-mers become nodes, and the ' +
            'sequence is recovered from an Eulerian path.',
        tags: ['c#', 'bioinformatics', 'graphs'],
        links: [{ label: 'code', href: 'https://github.com/PrideInt/DE_BRUIJN_ASSEMBLY' }],
    },
    {
        title: 'ProjectKorraSpirits',
        year: '2025',
        description:
            'A standalone Spirits plugin for ProjectKorra on Minecraft: a spirit world, a ' +
            'boss, spirit items, new abilities, and a developer API for spawning and ' +
            'managing spirits. In development.',
        tags: ['java', 'spigot', 'minecraft'],
        links: [{ label: 'code', href: 'https://github.com/PrideInt/ProjectKorraSpirits' }],
    },
]

export const research = [
    {
        title:
            "Microbes and metabolites of a plant-parasite interaction: Deciphering the ecology " +
            "of Tetrastigma host choice in the world's largest parasitic flower, Rafflesia",
        authors: 'Molina J., … Yin P., … Pell S.',
        venue: 'Current Plant Biology 42, 100456',
        year: '2025',
        kind: 'journal article',
        italics: ['Rafflesia', 'Tetrastigma'],
        summary:
            'Pairs metagenomic and metabolomic profiles of Rafflesia buds and their Tetrastigma ' +
            'host vines to link microbes with the chemistry of host choice. Polyphenol-associated ' +
            'bacteria and gall-like signatures suggest the buds reshape host tissue to develop.',
        links: [{ label: 'doi', href: 'https://doi.org/10.1016/j.cpb.2025.100456' }],
    },
    {
        title:
            'Untargeted metabolomics reveals host responses and metabolites linked to ' +
            'host compatibility in Rafflesiaceae parasitism',
        authors: 'Molina J., Abzalimov R., Yin P., Wicaksono A., Bernier F., Hill J., Bürger M., Wen J., Pell S. K.',
        venue: 'bioRxiv, Plant Biology',
        year: '2026',
        kind: 'preprint',
        italics: ['Tetrastigma', 'Rafflesia'],
        summary:
            'Untargeted LC-MS metabolomics of Rafflesia buds and seeds, infected and uninfected ' +
            'Tetrastigma hosts, and non-host relatives from the Philippines and Thailand. Infected ' +
            'hosts shift toward defense and hormone signaling while non-hosts carry more defensive ' +
            'compounds, pointing to chemistry as a gatekeeper of host compatibility.',
        links: [{ label: 'biorxiv', href: 'https://www.biorxiv.org/content/10.64898/2026.07.19.739411v1' }],
    },
]

export const about = [
    'I began coding at 10 years old because I wanted to make something cool in Minecraft. Started with Java, then rapidly ' + 
    'moved onto every other language under my belt since then. ' +
    'I love the thrill of not knowing what I can do until I try. ' +
    'I actually wanted to be a filmmaker up until I branched out further academically and figured why not, I\'ll just do what I\'m already good at.',
]

export const integrations = {
    letterboxdUser: 'pridelightbourn',
    endpoint: '',

    letterboxdOverrides: {
        banner: '',
        favorites: [],
    },
}

export const music = {
    defaultSong: 'redred.mp3',
    volume: 0.1,     // 0 to 1 (0.6 = 60%)
    fadeMs: 1000,    // how long a song takes to fade in
    fadeOutMs: 2000, // how long a song fades out, when switched or as it ends
    gapMs: 1000,     // silence between songs
    autoplay: true,  // start the music when a visitor clicks "begin" on the intro
}
