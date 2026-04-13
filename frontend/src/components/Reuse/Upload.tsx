import React from "react";

interface UploadProps {
  label?: string;
  onUpload: (files: FileList) => void;
}


const Upload: React.FC<UploadProps> = ({ 
  label = "Choose a file", 
  onUpload
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(e.target.files);
    }
  };

  return (
    <div className="mt-5" >
      <label 
        htmlFor="upload"
        className="border-0 px-10 py-3 w-30 md:w-50 lg:w-70 font-extrabold rounded-3xl border-emerald-300 shadow-emerald-300 transition-all duration-300 hover:shadow-yellow-300 shadow-sm hover:bg-gray-900 hover:border-amber-300"
      >
        {label}
      </label>
      <input
        id="upload"
        type="file"
        onChange={handleChange}
        style={{ display: "none" }}
      />
    </div>
  );
};

export default Upload;
