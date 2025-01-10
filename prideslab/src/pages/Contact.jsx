import Styling from './styling.module.css'

import { useEffect } from 'react'

function Contact() {
    useEffect(() => {
        document.title = 'Home';
    }, []);

    return (
        <div>

        </div>
    )
}

export default Contact