document.addEventListener('DOMContentLoaded', () => {
    // Preview image for new card
    const imageUrlInput = document.getElementById('imageUrl');
    imageUrlInput.addEventListener('change', (event) => previewImage(event, false));
  
    // Preview image for editing card
    const editImageUrlInput = document.getElementById('editImageUrl');
    editImageUrlInput.addEventListener('change', (event) => previewImage(event, true));
  });
  
  /**
   * Function to preview an image after a file is selected.
   * @param {Event} event - The file input change event.
   * @param {boolean} isEdit - Determines if the preview is for the edit form.
   */
  function previewImage(event, isEdit = false) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
  
      reader.onload = function(e) {
        if (isEdit) {
          const editImagePreview = document.getElementById('editImagePreview');
          editImagePreview.src = e.target.result;
          editImagePreview.style.display = 'block';
        } else {
          // Display preview image in new card form
          const newImagePreview = document.getElementById('newImagePreview');
          if (!newImagePreview) {
            const previewImageElement = document.createElement('img');
            previewImageElement.id = 'newImagePreview';
            previewImageElement.classList.add('image-preview');
            previewImageElement.src = e.target.result;
            document.getElementById('membershipForm').appendChild(previewImageElement);
          } else {
            newImagePreview.src = e.target.result;
          }
        }
      };
  
      reader.readAsDataURL(file);
    } else {
      alert('Please select a valid image file.');
    }
  }
  