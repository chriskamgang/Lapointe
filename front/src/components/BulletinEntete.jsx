import React from 'react';
import sem from '../images/logo.png'
import { downloadTraductions } from '../local/bulletin';
import { getLang } from '../utils/lang';
import { useSchool } from '../contexts/SchoolContext';
const BulletinEntete = ({student, currentClass, actualExam}) => {
    const { schoolSettings, getLogoUrl } = useSchool();
        
    const months = [
        'Incorrect',
        'Janvier',
        'Fevrier',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Aout',
        'Septembre',
        'Octobre',
        'Novembre',
        'Decembre'
    ]
    
    const date = new Date(student.birthday).getDate() + ' '+ months[new Date(student.birthday).getMonth()] + " " + new Date(student.birthday).getUTCFullYear()
    return <div>
            <table className='table2'style={{ width: '100%', display: 'flex', justifyContent: 'space-evenly'}} >
                <thead style={{ width: '100%', display: 'flex', justifyContent: 'space-evenly'}}>
                    <tr style={{ width: '100%', display: 'flex', justifyContent: 'space-evenly'}}>
                        <th>
                            REPUBLIQUE DU CAMEROUN <br />
                            Paix - Travail - Patrie <br />
                            {schoolSettings.school_name?.toUpperCase() || 'GROUPE SCOLAIRE BILINGUE PRIVE LAIC LA SEMENCE'}  <br />
                            {schoolSettings.school_address && <>{schoolSettings.school_address} <br /></>}
                            {schoolSettings.school_phone && <>TEL: {schoolSettings.school_phone} <br /></>}
                        </th>
                        <th className=' '>
                            <img src={getLogoUrl() || sem} height={200} alt={`${schoolSettings.school_name || 'École'} logo`} />
                        </th>
                        <th className=''>
                            REPUBLIC OF CAMEROON  <br />
                            Peace - Work - Father/land  <br />
                            {schoolSettings.school_name?.toUpperCase() || 'GROUPE SCOLAIRE BILINGUE PRIVE LAIC LA SEMENCE'}  <br />
                            {schoolSettings.school_address && <>{schoolSettings.school_address}  <br /></>}
                            {schoolSettings.school_phone && <>Tel : {schoolSettings.school_phone} <br /></>}
                        </th>
                    </tr>
                </thead>
            </table>

            <h2 style={{textAlign: 'center'}}>
                {downloadTraductions[getLang()].evalB} {actualExam.name} 2021/2022
            </h2>

            
            <div>
            <table className='table table-light table-bordered table-striped'>
            <thead style={{textAlign: 'center'}}>
                <tr>
                    <th>{downloadTraductions[getLang()].nameAndSubname}</th>
                    <th colSpan={5}>
                        {student.name} {student.subname}
                    </th>
                </tr>
                <tr>
                    <th colSpan={2}>{downloadTraductions[getLang()].birthday}</th>
                    <th  colSpan={2}>
                        {
                            date
                        }
                    </th>
                    <th>{downloadTraductions[getLang()].sex}</th>
                    <th>
                        {
                            student.sex === 'm' ? 'Masculin' : 'Feminin'
                        }
                    </th>
                </tr>
                <tr>
                    <th>{downloadTraductions[getLang()].class}</th>
                    <th>
                        {
                            currentClass.name
                        }
                    </th>
                    <th>Effectif</th>
                    <th>{currentClass.total_students}</th>
                    <th>{downloadTraductions[getLang()].teacher}</th>
                    <th>{currentClass.teacher_name} {currentClass.teacher_subname}</th>
                </tr>
            </thead>
            </table>
            </div>
            
        </div>
}

export default BulletinEntete;