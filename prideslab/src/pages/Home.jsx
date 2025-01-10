import Styling from './styling.module.css'

import { useEffect } from 'react';

function Home() {
    useEffect(() => {
        document.title = 'Home';
    }, []);
    
    return (
        <div>
            
        </div>
    )
}

export default Home