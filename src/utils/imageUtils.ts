/**
 * Convert an image URL to Base64 format
 * This is necessary for jsPDF to render images from external URLs
 */
export async function imageUrlToBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous' // Handle CORS

        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Failed to get canvas context'))
                return
            }

            ctx.drawImage(img, 0, 0)

            try {
                const dataURL = canvas.toDataURL('image/png')
                resolve(dataURL)
            } catch (err) {
                reject(err)
            }
        }

        img.onerror = () => {
            reject(new Error('Failed to load image'))
        }

        // Add timestamp to avoid caching issues
        img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime()
    })
}

/**
 * Get image format from URL or data URL
 */
export function getImageFormat(url: string): 'PNG' | 'JPEG' | 'JPG' {
    const lowerUrl = url.toLowerCase()

    if (lowerUrl.includes('.png') || lowerUrl.includes('image/png')) {
        return 'PNG'
    } else if (lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('image/jpeg')) {
        return 'JPEG'
    }

    // Default to PNG
    return 'PNG'
}

/**
 * Calculate aspect ratio dimensions for image
 */
export function calculateImageDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight

    let width = maxWidth
    let height = maxWidth / aspectRatio

    if (height > maxHeight) {
        height = maxHeight
        width = maxHeight * aspectRatio
    }

    return { width, height }
}
