import { useState } from 'react';
import { ScaleLoader } from 'react-spinners';

const Loader = () => {
  const [loading] = useState(true);

  return (
    <div className="sweet-loading">
      <ScaleLoader
        color="#123abc"
        loading={loading}
      />
    </div>
  );
};

export default Loader;