<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carte Professionnelle</title>
    <style>
        @page {
            margin: 0;
            size: 320pt 200pt; /* Format carte bancaire (86mm x 54mm) */
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            width: 320pt;
            height: 200pt;
            position: relative;
            background: white;
            overflow: hidden;
            border-radius: 8pt;
            box-shadow: 0 2pt 8pt rgba(0,0,0,0.15);
        }
        
        .card-container {
            width: 100%;
            height: 100%;
            position: relative;
            border: 1pt solid #E0E0E0;
            border-radius: 8pt;
            overflow: hidden;
        }
        
        /* Header Section similaire à la carte étudiante */
        .header {
            background: #4A6FFF;
            color: white;
            padding: 8pt 12pt 6pt 12pt;
            position: relative;
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: -4pt;
            left: 0;
            right: 0;
            height: 4pt;
            background: linear-gradient(90deg, #4A6FFF 0%, #7B68EE 100%);
        }
        
        .school-acronym {
            font-size: 11pt;
            font-weight: bold;
            letter-spacing: 2pt;
            margin-bottom: 2pt;
        }
        
        .school-full-name {
            font-size: 6pt;
            opacity: 0.9;
            line-height: 1.2;
        }
        
        /* Main Content Area */
        .main-content {
            display: flex;
            padding: 8pt 12pt;
            height: calc(100% - 50pt);
            gap: 10pt;
        }
        
        /* Left Section - Info */
        .info-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        
        .staff-info {
            flex-grow: 1;
        }
        
        .staff-name {
            font-size: 9pt;
            font-weight: bold;
            color: #333;
            margin-bottom: 2pt;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
        }
        
        .staff-id {
            font-size: 7pt;
            color: #666;
            margin-bottom: 4pt;
        }
        
        .staff-role {
            font-size: 7pt;
            color: #4A6FFF;
            font-weight: bold;
            margin-bottom: 4pt;
            text-transform: uppercase;
        }
        
        .staff-details {
            font-size: 6pt;
            color: #666;
            line-height: 1.3;
        }
        
        .staff-details .detail-row {
            margin-bottom: 1pt;
        }
        
        .detail-label {
            font-weight: bold;
            color: #333;
        }
        
        /* Right Section - Photo and QR */
        .visual-section {
            width: 80pt;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6pt;
        }
        
        .photo-container {
            width: 60pt;
            height: 70pt;
            border-radius: 6pt;
            overflow: hidden;
            border: 2pt solid #E0E0E0;
            background: #F5F5F5;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .staff-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .photo-placeholder {
            color: #999;
            font-size: 8pt;
            text-align: center;
        }
        
        .qr-container {
            width: 40pt;
            height: 40pt;
            background: white;
            border: 1pt solid #E0E0E0;
            border-radius: 4pt;
            padding: 2pt;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .qr-code {
            width: 100%;
            height: 100%;
        }
        
        /* Footer Section */
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(90deg, #4A6FFF 0%, #7B68EE 50%, #4A6FFF 100%);
            color: white;
            text-align: center;
            padding: 3pt;
            font-size: 5pt;
            font-weight: bold;
        }
        
        .academic-year {
            background: #4A6FFF;
            color: white;
            padding: 2pt 6pt;
            border-radius: 3pt;
            font-size: 6pt;
            font-weight: bold;
            position: absolute;
            top: 8pt;
            right: 12pt;
        }
        
        /* Logo */
        .logo {
            position: absolute;
            top: 6pt;
            right: 60pt;
            width: 24pt;
            height: 24pt;
            border-radius: 50%;
            border: 1pt solid rgba(255,255,255,0.3);
            object-fit: cover;
            background: rgba(255,255,255,0.1);
        }
        
        .logo-placeholder {
            position: absolute;
            top: 8pt;
            right: 60pt;
            width: 20pt;
            height: 20pt;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 5pt;
            color: rgba(255,255,255,0.8);
        }
    </style>
</head>
<body>
    <div class="card-container">
        <!-- Header inspiré de la carte étudiante -->
        <div class="header">
            <div class="school-acronym">CPB</div>
            <div class="school-full-name">COLLÈGE POLYVALENT<br>BILINGUE DE DOUALA</div>
            @php
                $logoPath = public_path('assets/logo.png');
            @endphp
            @if(file_exists($logoPath))
                <img src="{{ public_path('assets/logo.png') }}" alt="Logo" class="logo">
            @else
                <div class="logo-placeholder">LOGO</div>
            @endif
            <div class="academic-year">
                @php
                    $currentYear = date('Y');
                    $nextYear = $currentYear + 1;
                @endphp
                {{ $currentYear }}/{{ $nextYear }}
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
            <!-- Left Section - Staff Information -->
            <div class="info-section">
                <div class="staff-info">
                    <div class="staff-name">{{ $user->name }}</div>
                    <div class="staff-id">ID: {{ str_pad($user->id, 6, '0', STR_PAD_LEFT) }}</div>
                    <div class="staff-role">
                        @switch($user->role)
                            @case('surveillant_general')
                                Surveillant Général
                                @break
                            @case('general_accountant')
                                Comptable Général
                                @break
                            @case('comptable_superieur')
                                Comptable Supérieur
                                @break
                            @case('comptable')
                                Comptable
                                @break
                            @case('secretaire')
                                Secrétaire
                                @break
                            @case('teacher')
                                Enseignant
                                @break
                            @case('accountant')
                                Comptable
                                @break
                            @default
                                Personnel
                        @endswitch
                    </div>
                    
                    <div class="staff-details">
                        <div class="detail-row">
                            <span class="detail-label">Email:</span> {{ Str::limit($user->email, 25) }}
                        </div>
                        @if($user->contact)
                        <div class="detail-row">
                            <span class="detail-label">Contact:</span> {{ $user->contact }}
                        </div>
                        @endif
                        <div class="detail-row">
                            <span class="detail-label">Statut:</span> {{ $user->is_active ? 'Actif' : 'Inactif' }}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Right Section - Photo and QR Code -->
            <div class="visual-section">
                <div class="photo-container">
                    @if($user->photo)
                        <img src="{{ $user->photo }}" alt="Photo" class="staff-photo" 
                             onerror="this.style.display='none'; this.parentNode.innerHTML='<div class=\'photo-placeholder\'>PHOTO<br>PERSONNEL</div>';">
                    @else
                        <div class="photo-placeholder">PHOTO<br>PERSONNEL</div>
                    @endif
                </div>
                
                <div class="qr-container">
                    <img src="{{ $qr_url }}" alt="QR Code" class="qr-code">
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            CARTE PROFESSIONNELLE • {{ strtoupper($generated_at) }}
        </div>
    </div>
</body>
</html>