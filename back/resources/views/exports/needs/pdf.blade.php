<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liste des Besoins</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
        }
        
        .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 14px;
            color: #666;
        }
        
        .info {
            text-align: right;
            margin-bottom: 20px;
            font-size: 10px;
            color: #666;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        
        th {
            background-color: #f2f2f2;
            font-weight: bold;
            font-size: 11px;
        }
        
        td {
            font-size: 10px;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .status {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
        }
        
        .status-pending {
            background-color: #fff3cd;
            color: #856404;
        }
        
        .status-approved {
            background-color: #d1edff;
            color: #0c5460;
        }
        
        .status-rejected {
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .summary {
            margin-top: 20px;
            text-align: right;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <img src="{{ public_path('assets/logo.png') }}" alt="Logo" style="width: 80px; height: 80px; margin-right: 20px;">
            <div style="text-align: center;">
                <div class="title">COLLÈGE POLYVALENT BILINGUE DE DOUALA</div>
                <div class="subtitle">
                    Liste des Besoins - 
                    @switch($status_filter)
                        @case('pending')
                            En Attente
                            @break
                        @case('approved')
                            Approuvés
                            @break
                        @case('rejected')
                            Rejetés
                            @break
                        @default
                            Tous
                    @endswitch
                </div>
            </div>
        </div>
    </div>
    
    <div class="info">
        Généré le {{ $generated_at }}
    </div>
    
    <table>
        <thead>
            <tr>
                <th width="5%">ID</th>
                <th width="15%">Nom</th>
                <th width="25%">Description</th>
                <th width="12%">Montant</th>
                <th width="10%">Statut</th>
                <th width="13%">Demandeur</th>
                <th width="10%">Date</th>
                <th width="10%">Approuvé par</th>
            </tr>
        </thead>
        <tbody>
            @php $total = 0; @endphp
            @foreach($needs as $need)
                @php $total += $need->amount; @endphp
                <tr>
                    <td class="text-center">{{ $need->id }}</td>
                    <td>{{ $need->name }}</td>
                    <td>{{ Str::limit($need->description, 50) }}</td>
                    <td class="text-right">{{ number_format($need->amount, 0, ',', ' ') }} FCFA</td>
                    <td class="text-center">
                        <span class="status status-{{ $need->status }}">
                            {{ $need->status_label }}
                        </span>
                    </td>
                    <td>{{ $need->user ? $need->user->name : '' }}</td>
                    <td class="text-center">{{ $need->created_at->format('d/m/Y') }}</td>
                    <td>{{ $need->approvedBy ? $need->approvedBy->name : '' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    
    <div class="summary">
        Total des montants: {{ number_format($total, 0, ',', ' ') }} FCFA
        <br>
        Nombre de besoins: {{ count($needs) }}
    </div>
</body>
</html>