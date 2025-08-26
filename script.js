// Theme Management
let theme = localStorage.getItem('theme') || 'dark';
const themeBtn = document.getElementById('btn-theme');

function applyTheme() {
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    if (themeBtn) {
        const themeIcon = themeBtn.querySelector('.theme-icon');
        const themeText = themeBtn.querySelector('.theme-text');
        
        if (theme === 'dark') {
            themeIcon.textContent = '🌙';
            themeText.textContent = 'Karanlık Tema';
        } else {
            themeIcon.textContent = '☀️';
            themeText.textContent = 'Açık Tema';
        }
        
        themeBtn.setAttribute('aria-pressed', theme === 'dark');
    }
    
    localStorage.setItem('theme', theme);
}

if (themeBtn) {
    themeBtn.onclick = () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme();
    };
}

applyTheme();

// Search Functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const ilCards = document.querySelectorAll('.il-card');
        
        ilCards.forEach(card => {
            const ilName = card.querySelector('.il-name').textContent.toLowerCase();
            const ilceler = card.querySelectorAll('.ilce');
            let hasMatch = ilName.includes(searchTerm);
            
            // İlçelerde arama
            ilceler.forEach(ilce => {
                const ilceName = ilce.textContent.toLowerCase();
                if (ilceName.includes(searchTerm)) {
                    hasMatch = true;
                    ilce.style.background = searchTerm ? 'var(--accent-primary)' : '';
                    ilce.style.color = searchTerm ? 'white' : '';
                } else {
                    ilce.style.background = '';
                    ilce.style.color = '';
                }
            });
            
            // Kartı göster/gizle
            card.style.display = hasMatch || !searchTerm ? 'block' : 'none';
            
            // Eşleşme varsa kartı aç
            if (hasMatch && searchTerm) {
                card.setAttribute('aria-expanded', 'true');
                const ilceList = card.querySelector('.ilceler');
                if (ilceList) ilceList.style.display = 'block';
            }
        });
    });
}

// Il/Ilce Accordion
const ilCards = document.querySelectorAll('.il-card[data-il-id]');
ilCards.forEach(ilCard => {
    const ilHeader = ilCard.querySelector('.il-header');
    
    const toggleIlceler = () => {
        const ilId = ilCard.dataset.ilId;
        const ilceList = document.getElementById(ilId);
        if (!ilceList) return;
        
        const isExpanded = ilCard.getAttribute('aria-expanded') === 'true';
        
        // Diğer açık kartları kapat
        document.querySelectorAll('.il-card[aria-expanded="true"]').forEach(expandedCard => {
            if (expandedCard !== ilCard) {
                expandedCard.setAttribute('aria-expanded', 'false');
                const otherIlceListId = expandedCard.dataset.ilId;
                const otherIlceList = document.getElementById(otherIlceListId);
                if (otherIlceList) otherIlceList.style.display = 'none';
            }
        });
        
        // Mevcut kartı aç/kapat
        ilCard.setAttribute('aria-expanded', !isExpanded);
        ilceList.style.display = !isExpanded ? 'block' : 'none';
    };
    
    ilHeader.addEventListener('click', toggleIlceler);
    ilHeader.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleIlceler();
        }
    });
});

// Ilce Click Handler
const ilceler = document.querySelectorAll('.ilce[data-lat][data-lon][data-name]');
ilceler.forEach(ilce => {
    const openDiagram = () => {
        const lat = ilce.dataset.lat;
        const lon = ilce.dataset.lon;
        const name = ilce.dataset.name;
        
        if (lat && lon && name) {
            const url = `diagram.html?lat=${lat}&lon=${lon}&name=${encodeURIComponent(name)}`;
            window.open(url, '_blank');
        }
    };
    
    ilce.addEventListener('click', (e) => {
        e.stopPropagation();
        openDiagram();
    });
    
    ilce.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openDiagram();
        }
    });
});

// Diagram Page JavaScript
if (window.location.pathname.includes('diagram.html')) {
    // URL parametrelerinden konum bilgisini al
    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get('lat'));
    const lon = parseFloat(urlParams.get('lon'));
    const locationName = urlParams.get('name') || 'Bilinmeyen Konum';
    
    // Sayfa yüklendiğinde konum bilgisini göster
    document.addEventListener('DOMContentLoaded', function() {
        const locationTitle = document.getElementById('locationTitle');
        const locationCoords = document.getElementById('locationCoords');
        
        if (locationTitle) {
            locationTitle.textContent = locationName;
        }
        
        if (locationCoords) {
            locationCoords.textContent = `Koordinat: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        }
        
        // Eğer geçerli koordinatlar varsa, hava durumu verilerini yükle
        if (!isNaN(lat) && !isNaN(lon)) {
            loadWeatherData(lat, lon);
        } else {
            hideLoading();
            alert('Geçersiz konum bilgisi!');
        }
    });
    
    function hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    function showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }
    
    // Meteoroloji modelleri
    const models = {
        "ECMWF": {"url": "https://api.open-meteo.com/v1/ecmwf", "weight": 5, "color": "#667eea"},
        "GFS": {"url": "https://api.open-meteo.com/v1/gfs", "weight": 5, "color": "#f093fb"},
        "ICON": {"url": "https://api.open-meteo.com/v1/dwd-icon", "weight": 5, "color": "#4facfe"},
        "ICON-EU": {"url": "https://api.open-meteo.com/v1/dwd-icon", "weight": 5, "color": "#43e97b"}
    };
    
    const paramsCommon = {
        latitude: lat,
        longitude: lon,
        hourly: "temperature_2m,temperature_850hPa,precipitation",
        temperature_unit: "celsius",
        precipitation_unit: "mm",
        timezone: "auto",
        forecast_days: 7
    };
    
    let modelData = {};
    let charts = {};
    
    // API'den veri çekme fonksiyonu
    async function loadWeatherData(latitude, longitude) {
        showLoading();
        
        try {
            for (const modelName in models) {
                const modelInfo = models[modelName];
                try {
                    const params = {
                        ...paramsCommon,
                        latitude: latitude,
                        longitude: longitude
                    };
                    
                    const response = await fetch(`${modelInfo.url}?${new URLSearchParams(params)}`);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.hourly) {
                        modelData[modelName] = {
                            time: data.hourly.time,
                            temperature_2m: data.hourly.temperature_2m,
                            temperature_850hPa: data.hourly.temperature_850hPa,
                            precipitation: data.hourly.precipitation
                        };
                    }
                } catch (error) {
                    console.error(`${modelName} verisi alınamadı:`, error);
                }
            }
            
            if (Object.keys(modelData).length > 0) {
                createCharts();
                updateWeatherSummary();
            } else {
                alert('Hiçbir meteoroloji modelinden veri alınamadı!');
            }
            
        } catch (error) {
            console.error('Hava durumu verileri yüklenirken hata:', error);
            alert('Hava durumu verileri yüklenirken bir hata oluştu!');
        }
        
        hideLoading();
    }
    
    function getComputedStyleValue(property) {
        return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
    }
    
    function createCharts() {
        // 2m Sıcaklık Grafiği
        createTemperatureChart();
        
        // 850hPa Sıcaklık Grafiği
        create850hPaChart();
        
        // Yağış Grafiği
        createPrecipitationChart();
    }
    
    function createTemperatureChart() {
        const ctx = document.getElementById('temperature2mChart');
        if (!ctx) return;
        
        const datasets = [];
        
        for (const [modelName, data] of Object.entries(modelData)) {
            if (data.temperature_2m) {
                datasets.push({
                    label: `${modelName} 2m Sıcaklık`,
                    data: data.temperature_2m,
                    borderColor: models[modelName].color,
                    backgroundColor: models[modelName].color + '20',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
            }
        }
        
        charts.temperature2m = new Chart(ctx, {
            type: 'line',
            data: {
                labels: modelData[Object.keys(modelData)[0]]?.time || [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Tarih ve Saat',
                            color: getComputedStyleValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyleValue('--border-color')
                        },
                        ticks: {
                            color: getComputedStyleValue('--text-muted'),
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Sıcaklık (°C)',
                            color: getComputedStyleValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyleValue('--border-color')
                        },
                        ticks: {
                            color: getComputedStyleValue('--text-muted')
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getComputedStyleValue('--text-primary'),
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: getComputedStyleValue('--bg-secondary'),
                        titleColor: getComputedStyleValue('--text-primary'),
                        bodyColor: getComputedStyleValue('--text-secondary'),
                        borderColor: getComputedStyleValue('--border-color'),
                        borderWidth: 1
                    }
                }
            }
        });
    }
    
    function create850hPaChart() {
        const ctx = document.getElementById('temperature850hPaChart');
        if (!ctx) return;
        
        const datasets = [];
        
        for (const [modelName, data] of Object.entries(modelData)) {
            if (data.temperature_850hPa) {
                datasets.push({
                    label: `${modelName} 850hPa Sıcaklık`,
                    data: data.temperature_850hPa,
                    borderColor: models[modelName].color,
                    backgroundColor: models[modelName].color + '20',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
            }
        }
        
        charts.temperature850hPa = new Chart(ctx, {
            type: 'line',
            data: {
                labels: modelData[Object.keys(modelData)[0]]?.time || [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Tarih ve Saat',
                            color: getComputedStyleValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyleValue('--border-color')
                        },
                        ticks: {
                            color: getComputedStyleValue('--text-muted'),
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Sıcaklık (°C)',
                            color: getComputedStyleValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyleValue('--border-color')
                        },
                        ticks: {
                            color: getComputedStyleValue('--text-muted')
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getComputedStyleValue('--text-primary'),
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: getComputedStyleValue('--bg-secondary'),
                        titleColor: getComputedStyleValue('--text-primary'),
                        bodyColor: getComputedStyleValue('--text-secondary'),
                        borderColor: getComputedStyleValue('--border-color'),
                        borderWidth: 1
                    }
                }
            }
        });
    }
    
    function createPrecipitationChart() {
        const ctx = document.getElementById('precipitationChart');
        if (!ctx) return;
        
        const datasets = [];
        
        for (const [modelName, data] of Object.entries(modelData)) {
            if (data.precipitation) {
                datasets.push({
                    label: `${modelName} Yağış`,
                    data: data.precipitation,
                    borderColor: models[modelName].color,
                    backgroundColor: models[modelName].color + '40',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
            }
        }
        
        charts.precipitation = new Chart(ctx, {
            type: 'line',
            data: {
                labels: modelData[Object.keys(modelData)[0]]?.time || [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Tarih ve Saat',
                            color: getComputedStyleValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyleValue('--border-color')
                        },
                        ticks: {
                            color: getComputedStyleValue('--text-muted'),
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Yağış (mm)',
                            color: getComputedStyleValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyleValue('--border-color')
                        },
                        ticks: {
                            color: getComputedStyleValue('--text-muted')
                        },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: getComputedStyleValue('--text-primary'),
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: getComputedStyleValue('--bg-secondary'),
                        titleColor: getComputedStyleValue('--text-primary'),
                        bodyColor: getComputedStyleValue('--text-secondary'),
                        borderColor: getComputedStyleValue('--border-color'),
                        borderWidth: 1
                    }
                }
            }
        });
    }
    
    function updateWeatherSummary() {
        try {
            // İlk modelden veri al (genellikle GFS)
            const firstModel = Object.keys(modelData)[0];
            if (!firstModel || !modelData[firstModel]) return;
            
            const data = modelData[firstModel];
            
            // Mevcut sıcaklık (ilk veri noktası)
            const currentTemp = data.temperature_2m?.[0];
            if (currentTemp !== undefined) {
                const currentTempEl = document.getElementById('currentTemp');
                if (currentTempEl) {
                    currentTempEl.textContent = `${Math.round(currentTemp)}°C`;
                }
            }
            
            // Min/Max sıcaklık
            if (data.temperature_2m && data.temperature_2m.length > 0) {
                const temps = data.temperature_2m.filter(t => t !== null && t !== undefined);
                if (temps.length > 0) {
                    const minTemp = Math.min(...temps);
                    const maxTemp = Math.max(...temps);
                    const minMaxTempEl = document.getElementById('minMaxTemp');
                    if (minMaxTempEl) {
                        minMaxTempEl.textContent = `${Math.round(minTemp)} / ${Math.round(maxTemp)}°C`;
                    }
                }
            }
            
            // Toplam yağış
            if (data.precipitation && data.precipitation.length > 0) {
                const precips = data.precipitation.filter(p => p !== null && p !== undefined);
                const totalPrecip = precips.reduce((sum, p) => sum + p, 0);
                const totalPrecipEl = document.getElementById('totalPrecip');
                if (totalPrecipEl) {
                    totalPrecipEl.textContent = `${totalPrecip.toFixed(1)} mm`;
                }
            }
            
            // Son güncelleme zamanı
            const lastUpdateEl = document.getElementById('lastUpdate');
            if (lastUpdateEl) {
                const now = new Date();
                lastUpdateEl.textContent = now.toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
        } catch (error) {
            console.error('Hava durumu özeti güncellenirken hata:', error);
        }
    }
}