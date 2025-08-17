import React, { useState } from 'react';
import UserProfile from '../Profile/UserProfile';
import EditLanguage from '../Profile/EditLanguage';
function ParamsCompt() {
	const [error, setError] = useState('');

	return (
		<div className='container-fluid py-4'>
			{error && (
				<div className="row mb-3">
					<div className="col-12">
						<div className="alert alert-danger alert-dismissible fade show" role="alert">
							{error}
							<button 
								type="button" 
								className="btn-close" 
								onClick={() => setError('')}
								aria-label="Close"
							></button>
						</div>
					</div>
				</div>
			)}
			
			{/* Profil utilisateur moderne */}
			<UserProfile />
			
			{/* Paramètres de langue */}
			<div className="row mt-4">
				<div className="col-12">
					<div className="card">
						<div className="card-header">
							<h5 className="mb-0">Paramètres de langue</h5>
						</div>
						<div className="card-body">
							<EditLanguage setError={setError}/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ParamsCompt