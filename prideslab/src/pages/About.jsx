import Styling from './styling.module.css'

import { useEffect } from 'react'

function About() {
    useEffect(() => {
        document.title = 'About';
    }, []);

    return (
        <div>

        </div>
    )
}

export default About