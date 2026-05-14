import Link from 'next/link';

const prototypes = [
  { id: 0, name: 'Prototype 0–Gray', color: '#e4e4e4', path: '/proto0' },
  { id: 1, name: 'Prototype 1–Red', color: '#ffcaca', path: '/proto1' },
  { id: 2, name: 'Prototype 2–Yellow', color: '#fff5c2', path: '/proto2' },
  { id: 3, name: 'Prototype 3–Green', color: '#d5ffdb', path: '/proto3' },
  { id: 4, name: 'Prototype 4–Blue', color: '#dae4ff', path: '/proto4' },
  { id: 5, name: 'Prototype 5–Purple', color: '#f5dbff', path: '/proto5' },
];

export default function StartPage() {
  return (
    <div className="bg-white min-h-screen w-full relative flex flex-col items-center pt-[70px] font-manrope">
      <h1 className="font-bold text-[32px] text-black opacity-70 mb-12">
        Prototypes
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] max-w-[1000px] px-8">
        {prototypes.map((proto) => (
          <Link
            key={proto.id}
            href={proto.path}
            className="group relative bg-gradient-to-b border border-[#ededed] border-solid flex flex-col items-start justify-end p-[20px] rounded-[20px] size-[300px] transition-all hover:shadow-lg hover:-translate-y-1"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${proto.color}, white)`,
            }}
          >
            <p className="font-semibold text-[20px] text-black w-full">
              {proto.name}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
