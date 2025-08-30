import React from 'react'
import { Link } from 'react-router-dom'
import { error404Traductions } from '../local/error404'
import { getLang } from '../utils/lang'

function Error404() {
  return (
    <div className='conError'>
        <h1 className="text-center ">404</h1>
        <div className="content_box_404">
            <h3 className="h2">
              {error404Traductions[getLang()].error}
            </h3>
        
            <Link to={'/class'} className="link_404">{error404Traductions[getLang()].help} </Link>
        </div>
    </div>
  )
}

export default Error404