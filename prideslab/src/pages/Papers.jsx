import Styling from './styling.module.css'

import { useEffect } from 'react'

function Papers() {
    useEffect(() => {
        document.title = 'Papers';
    }, []);

    return (
        <div>

        </div>
    )
}

export default Papers